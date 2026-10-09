import { Lexer, Tokenizer, type Token, type TokenizerExtensionFunction, type Tokens } from 'marked'
import {
    assertMappedValue,
    concatMapped,
    mappedSource,
    ProvenanceCollector,
    replaceMapped,
    replacementMapped,
    sliceMapped,
    type MappedView
} from '../streaming-provenance.js'
import {
    createTextAdapters,
    linesMapped,
    listViews,
    normalizeBlock,
    tableCells
} from './grammar.js'

// The installed grammar remains authoritative. Adapters replay only its input transformations.
type AnyToken = Token & { text?: string; tokens?: Token[] }
interface Frame {
    source: string
    normalized: string
    tokens: Token[]
    inline: boolean
    events: Event[]
    cursor: number
    last?: AnyToken
}
interface Event {
    rule: string
    input: string
    offset: number
    token?: AnyToken
    raw?: string
    text?: string
    target?: AnyToken
    frames: Frame[]
    frame: Frame
    steps: (Frame | Event)[]
}
const empty = () => mappedSource('')
/** Instance-local tracer. Frames are captured provisionally, then resolved from accepted rules. */
export const traceLexer = (
    lexer: Lexer,
    source: string,
    inline: boolean,
    collector: ProvenanceCollector,
    base: number,
    suppliedTokenizer = false
): (() => void) => {
    const tokenizer = lexer.options.tokenizer!
    const rules = tokenizer.rules
    const stack: Frame[] = []
    const calls: Event[] = []
    const owners = new WeakMap<Token[], object>()
    const roots: Frame[] = []
    const unsupported =
        suppliedTokenizer ||
        (!!lexer.options.tokenizer && Object.getPrototypeOf(tokenizer) !== Tokenizer.prototype) ||
        !!lexer.options.walkTokens
    // Supplied tokenizers may override instance methods without subclassing. Never instrument
    // or mutate such shared instances. walkTokens may rewrite any token after lexing, so it
    // conservatively makes this whole parse unknown; equality of type/raw/text cannot establish
    // origins.
    if (unsupported)
        return () => {
            collector.capture(lexer.tokens)
        }

    // Extension tokenizers are opaque: their tokens, and everything lexed on their behalf,
    // stay unknown. Built-in tokens around them keep exact provenance. Merging built-in text
    // into an opaque token (or any resolution failure) poisons the whole parse back to unknown.
    let suspended = 0
    let poisoned = false
    const opaque = new WeakSet<object>()
    const extensions = lexer.options.extensions
    if (extensions) {
        const wrap = (fn: TokenizerExtensionFunction): TokenizerExtensionFunction =>
            function (src, tokens) {
                const frame = stack.at(-1)
                if (!suspended && frame) finish(frame)
                const queued = lexer.inlineQueue.length
                suspended++
                let token: ReturnType<TokenizerExtensionFunction>
                try {
                    token = fn.call(this, src, tokens)
                } finally {
                    suspended--
                }
                for (const entry of lexer.inlineQueue.slice(queued)) opaque.add(entry.tokens)
                if (token) opaque.add(token)
                return token
            }
        // The lexer owns a shallow copy of the caller's options; replace, never mutate, the
        // shared extensions object.
        lexer.options = {
            ...lexer.options,
            extensions: {
                ...extensions,
                ...(extensions.block ? { block: extensions.block.map(wrap) } : {}),
                ...(extensions.inline ? { inline: extensions.inline.map(wrap) } : {})
            }
        }
    }

    for (const kind of ['blockTokens', 'inlineTokens'] as const) {
        const original = lexer[kind].bind(lexer)
        const wrapped = (input: string, tokens: Token[] = [], clipped?: boolean) => {
            if (suspended || opaque.has(tokens)) {
                suspended++
                try {
                    return original(input, tokens, clipped)
                } finally {
                    suspended--
                }
            }
            const frame: Frame = {
                source: input,
                normalized: normalizeBlock(mappedSource(input), lexer.options.pedantic ?? false)
                    .value,
                tokens,
                inline: kind === 'inlineTokens',
                events: [],
                cursor: 0
            }
            if (calls.length) {
                calls.at(-1)!.frames.push(frame)
                calls.at(-1)!.steps.push(frame)
            } else roots.push(frame)
            stack.push(frame)
            const output = original(input, tokens, clipped)
            finish(frame)
            frame.last = frame.tokens.at(-1) as AnyToken | undefined
            stack.pop()
            return output
        }
        if (kind === 'blockTokens') lexer.blockTokens = wrapped as typeof lexer.blockTokens
        else lexer.inlineTokens = wrapped
    }
    const finish = (frame: Frame) => {
        const event = frame.events.at(-1)
        if (!event?.token || event.target) return
        if (frame.tokens.includes(event.token)) event.target = event.token
        else {
            const last = frame.tokens.at(-1) as AnyToken | undefined
            // Only actual mutation of the preceding emitted token is a merge.
            if (
                (last &&
                    (last.type === 'text' || last.type === 'paragraph') &&
                    event.rule !== 'def') ||
                (last && event.rule === 'space' && event.raw?.length === 1)
            )
                event.target = last
        }
    }
    for (const rule of Object.getOwnPropertyNames(Tokenizer.prototype)) {
        if (rule === 'constructor') continue
        const original = (
            tokenizer as unknown as Record<string, (..._args: unknown[]) => AnyToken | undefined>
        )[rule].bind(tokenizer)
        ;(tokenizer as unknown as Record<string, (..._args: unknown[]) => AnyToken | undefined>)[
            rule
        ] = (...args) => {
            if (suspended) return original(...args)
            const frame = stack.at(-1)!
            const input = args[0] as string
            if ((frame.inline && rule === 'escape') || (!frame.inline && rule === 'space')) {
                finish(frame)
                // These first probes receive the full unconsumed frame, unlike clipped text probes.
                const normalizedLength = frame.inline
                    ? frame.source.length
                    : frame.normalized.length
                frame.cursor = normalizedLength - input.length
            }
            const parent = calls.at(-1)
            const direct = parent?.frame === frame && (rule === 'blockquote' || rule === 'list')
            const event: Event = {
                rule,
                input,
                offset: direct ? 0 : frame.cursor,
                frames: [],
                frame,
                steps: []
            }
            calls.push(event)
            const token = original(...args)
            calls.pop()
            if (token) {
                event.token = token
                event.raw = token.raw
                event.text = token.text
                if (direct) {
                    event.target = token
                    parent.steps.push(event)
                } else frame.events.push(event)
            }
            return token
        }
    }
    const textAdapters = createTextAdapters(rules, lexer.options.pedantic ?? false)
    const resolveTable = (token: AnyToken, raw: MappedView) => {
        const cap = new RegExp(rules.block.table.source, rules.block.table.flags + 'd').exec(
            raw.value
        )!
        const headerRange = cap.indices![1]!
        const cells = tableCells(sliceMapped(raw, headerRange[0], headerRange[1]))
        const table = token as Tokens.Table
        table.header.forEach((cell, i) => {
            collector.set(cell, {
                exact: true,
                sourceSpans: cells[i].runs.flatMap((run) => run.sources),
                text: assertMappedValue(cells[i], cell.text, 'header cell')
            })
            owners.set(cell.tokens, cell)
        })
        if (cap.indices![3]) {
            const range = cap.indices![3]
            const rows = linesMapped(
                replaceMapped(
                    sliceMapped(raw, range[0], range[1]),
                    rules.other.tableRowBlankLine,
                    () => empty()
                )
            )
            table.rows.forEach((row, i) => {
                const mapped = tableCells(rows[i], table.header.length)
                row.forEach((cell, j) => {
                    collector.set(cell, {
                        exact: true,
                        sourceSpans: mapped[j].runs.flatMap((run) => run.sources),
                        text: assertMappedValue(mapped[j], cell.text, 'row cell')
                    })
                    owners.set(cell.tokens, cell)
                })
            })
        }
    }
    const quoteText = (view: MappedView) =>
        replaceMapped(
            replaceMapped(view, rules.other.blockquoteSetextReplace, (match, input) =>
                concatMapped(
                    sliceMapped(input, 0, 1),
                    replacementMapped('    ', empty()),
                    sliceMapped(input, input.value.length - match[1].length)
                )
            ),
            rules.other.blockquoteSetextReplace2,
            () => empty()
        )
    const quoteContinuationRaw = (
        raw: MappedView,
        join: MappedView,
        remaining: MappedView,
        directInput: MappedView,
        step: Event
    ) => {
        const leftover = directInput.value.slice(step.raw!.length).replace(/^\n/, '')
        const leftoverCount = leftover ? leftover.split('\n').length : 0
        const lines = linesMapped(remaining)
        const count = lines.length - leftoverCount
        if (count > 0) {
            const length = lines.slice(0, count).reduce((n, line) => n + line.value.length + 1, -1)
            return concatMapped(raw, join, sliceMapped(remaining, 0, length))
        }
        return raw
    }
    const resolveQuote = (event: Event, input: MappedView) => {
        const cap = rules.block.blockquote.exec(input.value)!
        let remaining = sliceMapped(input, 0, cap[0].replace(/\n+$/, '').length)
        let raw = empty()
        let text = empty()
        let join = empty()
        let old: AnyToken | undefined
        for (const step of event.steps) {
            if ('events' in step) {
                const lines = linesMapped(remaining)
                let inQuote = false
                let count = 0
                for (const line of lines) {
                    if (rules.other.blockquoteStart.test(line.value)) inQuote = true
                    else if (inQuote) break
                    count++
                }
                const length = lines
                    .slice(0, count)
                    .reduce((n, line) => n + line.value.length + 1, -1)
                const part = sliceMapped(remaining, 0, length)
                const separator = raw.value ? join : empty()
                raw = concatMapped(raw, separator, part)
                text = concatMapped(text, separator, quoteText(part))
                const leading = sliceMapped(remaining, length, length + 1)
                remaining = sliceMapped(remaining, length + 1)
                join = leading
                resolve(step, quoteText(part), separator)
                old = step.last
            } else {
                const oldRaw = old && collector.get(old)?.raw
                if (!oldRaw)
                    throw new Error('Direct continuation has no mapped previous nested token')
                // Marked concatenates a literal newline even when old raw already ends in one.
                const separator = replacementMapped('\n', empty())
                const continuation =
                    step.rule === 'blockquote'
                        ? replaceMapped(remaining, rules.other.blockquoteSetextReplace2, () =>
                              empty()
                          )
                        : remaining
                const directInput = concatMapped(oldRaw, separator, continuation)
                assertMappedValue(directInput, step.input, 'direct continuation input')
                resolve(
                    {
                        source: step.input,
                        normalized: step.input,
                        tokens: [step.token!],
                        inline: false,
                        events: [step],
                        cursor: 0
                    },
                    directInput
                )
                const next = collector.get(step.token!)!
                if (step.rule === 'list') {
                    raw = concatMapped(
                        sliceMapped(raw, 0, raw.value.length - oldRaw.value.length),
                        next.raw!
                    )
                    text = concatMapped(
                        sliceMapped(text, 0, text.value.length - oldRaw.value.length),
                        next.raw!
                    )
                    remaining = sliceMapped(directInput, step.raw!.length)
                } else {
                    raw = quoteContinuationRaw(raw, join, remaining, directInput, step)
                    const oldText = collector.get(old!)?.text
                    text = concatMapped(
                        sliceMapped(text, 0, text.value.length - oldText!.value.length),
                        next.text!
                    )
                }
            }
        }
        assertMappedValue(raw, event.raw!, 'blockquote raw construction')
        assertMappedValue(text, event.text!, 'blockquote text construction')
        const target = event.target!
        collector.set(target, {
            exact: true,
            raw,
            text,
            sourceSpans: raw.runs.flatMap((run) => run.sources)
        })
        if (target.tokens) owners.set(target.tokens, target)
    }
    const mergeSeparator = (
        event: Event,
        frame: Frame,
        view: MappedView,
        text: MappedView | undefined,
        previousText: MappedView | undefined,
        leading: MappedView
    ) => {
        return !frame.inline && text && previousText
            ? event.offset
                ? sliceMapped(view, event.offset - 1, event.offset)
                : leading
            : empty()
    }
    /** Opaque targets stay unknown. A lone newline only extends their raw; any other merge poisons. */
    const mergesIntoOpaque = (event: Event) => {
        if (!event.target || !opaque.has(event.target)) return false
        if (!(event.rule === 'space' && event.raw?.length === 1)) poisoned = true
        return true
    }
    const recordEvent = (
        event: Event,
        frame: Frame,
        view: MappedView,
        raw: MappedView,
        text: MappedView | undefined,
        leading: MappedView
    ) => {
        const token = event.token!
        const target = event.target
        if (mergesIntoOpaque(event)) return
        if (target) {
            const previous = target === token ? undefined : collector.get(target)
            const separator = mergeSeparator(event, frame, view, text, previous?.text, leading)
            const combinedText =
                previous?.text && text
                    ? concatMapped(previous.text, separator, text)
                    : (text ?? previous?.text)
            const combinedRaw = previous?.raw ? concatMapped(previous.raw, raw) : raw
            collector.set(target, {
                exact: true,
                sourceSpans: combinedRaw.runs.flatMap((run) => run.sources),
                raw: combinedRaw,
                ...(combinedText ? { text: combinedText } : {})
            })
            if (target.tokens) owners.set(target.tokens, target)
        }
    }
    const finalizeList = (list: Tokens.List, descendants: MappedView[]) => {
        list.items.forEach((item, i) => {
            let itemView = descendants[i]
            if (item.task) {
                itemView = replaceMapped(itemView, rules.other.listReplaceTask, () => empty())
                const first = item.tokens.find(
                    (child) => child.type === 'text' || child.type === 'paragraph'
                ) as AnyToken | undefined
                if (first) {
                    const map = collector.get(first)!
                    const textView = replaceMapped(map.text!, rules.other.listReplaceTask, () =>
                        empty()
                    )
                    collector.set(first, { ...map, text: textView })
                }
            }
            collector.set(item, {
                exact: true,
                sourceSpans: itemView.runs.flatMap((run) => run.sources),
                text: assertMappedValue(itemView, item.text, 'list item text')
            })
        })
    }
    const resolveEvent = (event: Event, frame: Frame, view: MappedView, leading: MappedView) => {
        const raw = sliceMapped(view, event.offset, event.offset + event.raw!.length)
        assertMappedValue(raw, event.raw!, `${event.rule} raw`)
        const token = event.token!
        const text = textAdapters[event.rule]?.(event, raw)
        const descendants =
            event.rule === 'list'
                ? listViews(raw, token as Tokens.List, rules, lexer.options.pedantic ?? false)
                : []
        if (event.rule === 'table') resolveTable(token, raw)
        if (
            !textAdapters[event.rule] &&
            !['list', 'table'].includes(event.rule) &&
            event.text !== undefined
        )
            throw new Error(`Missing built-in provenance adapter: ${event.rule}`)
        if (text) assertMappedValue(text, event.text!, event.rule)
        recordEvent(event, frame, view, raw, text, leading)
        // Children are provisional until the successful parent tells us its transformation.
        event.frames.forEach((child, i) => resolve(child, descendants[i] ?? text ?? raw))
        if (event.rule === 'list') finalizeList(token as Tokens.List, descendants)
        if ((event.rule === 'autolink' || event.rule === 'url') && token.tokens)
            token.tokens.forEach((child) =>
                collector.set(child, {
                    exact: true,
                    sourceSpans: text!.runs.flatMap((run) => run.sources),
                    raw: text,
                    text
                })
            )
    }
    const resolve = (frame: Frame, view: MappedView, leading = empty()) => {
        view = frame.inline ? view : normalizeBlock(view, lexer.options.pedantic ?? false)
        assertMappedValue(view, frame.inline ? frame.source : frame.normalized, 'frame input')
        collector.counters.mappedInputUnits += view.value.length
        for (const event of frame.events) {
            if (event.rule === 'blockquote') {
                resolveQuote(event, sliceMapped(view, event.offset))
                continue
            }
            resolveEvent(event, frame, view, leading)
        }
    }
    const resolveAll = () => {
        let input = mappedSource(source, base)
        if (!inline)
            input = replaceMapped(input, /\r\n|\r/g, (_match, span) =>
                replacementMapped('\n', span)
            )
        resolve(roots[0], input)
        // Deferred queue entries are token arrays, not values. Resolve their FINAL owner inputs.
        for (const frame of roots.slice(1)) {
            const owner = owners.get(frame.tokens)
            const text = owner && collector.get(owner)?.text
            if (!text) throw new Error('Provenance deferred inline input has no accepted owner')
            resolve(frame, assertMappedValue(text, frame.source, 'deferred inline input'))
        }
    }
    if (!extensions) return resolveAll
    return () => {
        try {
            resolveAll()
            if (!poisoned) return
        } catch {
            // Fall through: an extension shaped the parse in a way the adapters cannot map.
        }
        markUnknown(collector, lexer.tokens)
    }
}

/** Overwrite every sidecar in `tokens` with unknown provenance, discarding partial mappings. */
const markUnknown = (collector: ProvenanceCollector, tokens: readonly object[]): void => {
    for (const token of tokens) {
        collector.set(token, { exact: false, sourceSpans: [] })
        const node = token as {
            tokens?: object[]
            items?: object[]
            header?: object[]
            rows?: object[][]
        }
        for (const key of ['tokens', 'items', 'header'] as const) {
            if (Array.isArray(node[key])) markUnknown(collector, node[key])
        }
        node.rows?.forEach((row) => markUnknown(collector, row))
    }
}
