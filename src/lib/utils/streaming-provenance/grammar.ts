import type { Token, Tokenizer, Tokens } from 'marked'
import {
    assertMappedValue,
    concatMapped,
    mappedSource,
    replaceMapped,
    replacementMapped,
    sliceMapped,
    trimMapped,
    type MappedView
} from '../streaming-provenance.js'
type RuleSet = Tokenizer['rules']
interface GrammarEvent {
    rule: string
    token?: Token
    text?: string
}
const empty = () => mappedSource('')
const newline = (view: MappedView, at: number) => sliceMapped(view, at, at + 1)
const unescapeLabel = (view: MappedView, rules: RuleSet) =>
    replaceMapped(view, rules.other.outputLinkReplace, (_match, input) => sliceMapped(input, 1))
const decodeNumeric = (view: MappedView, rules: RuleSet) =>
    replaceMapped(view, rules.other.numericCharacterReference, (match, input) => {
        const code = Number.parseInt(match[1] ?? match[2], match[1] === undefined ? 16 : 10)
        return replacementMapped(
            code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)
                ? '�'
                : String.fromCodePoint(code),
            input
        )
    })
const expandTabs = (view: MappedView, indent = 0): MappedView => {
    let col = indent
    const pieces: MappedView[] = []
    // Marked's tab columns count codepoints, while mapping offsets are UTF-16.
    let at = 0
    for (const char of view.value) {
        const input = sliceMapped(view, at, at + char.length)
        const width = char === '\t' ? 4 - (col % 4) : 1
        pieces.push(char === '\t' ? replacementMapped(' '.repeat(width), input) : input)
        col += width
        at += char.length
    }
    return concatMapped(...pieces)
}
export const linesMapped = (view: MappedView): MappedView[] => {
    let at = 0
    return view.value.split('\n').map((line) => {
        const result = sliceMapped(view, at, at + line.length)
        at += line.length + 1
        return result
    })
}
/** Replay list contents from the authoritative item raw spans. Items are sequential, never searched. */
export const listViews = (
    raw: MappedView,
    token: Tokens.List,
    rules: RuleSet,
    pedantic: boolean
): MappedView[] => {
    let cursor = 0
    const bullet = token.ordered
        ? `\\d{1,9}\\${token.raw.match(/^ *\d+([.)])/)![1]}`
        : pedantic
          ? '[*+-]'
          : `\\${token.raw.trimStart()[0]}`
    return token.items.map((item, index) => {
        const itemRaw = sliceMapped(raw, cursor, cursor + item.raw.length)
        assertMappedValue(itemRaw, item.raw, 'list item raw')
        cursor += item.raw.length
        const cap = rules.other.listItemRegex(bullet).exec(itemRaw.value)!
        const first = cap[2].split('\n', 1)[0]
        const bulletIndent = cap[1].length
        let line = sliceMapped(itemRaw, bulletIndent, bulletIndent + first.length)
        line = pedantic
            ? expandTabs(line, bulletIndent)
            : replaceMapped(line, rules.other.leadingSpaceTab, (_match, input) =>
                  expandTabs(input, bulletIndent)
              )
        let indent: number
        let contents: MappedView
        if (pedantic) {
            indent = 2
            contents = sliceMapped(line, line.value.length - line.value.trimStart().length)
        } else if (!line.value.trim()) {
            indent = bulletIndent + 1
            contents = empty()
        } else {
            indent = line.value.search(rules.other.nonSpaceChar)
            indent = indent > 4 ? 1 : indent
            contents = sliceMapped(line, indent)
            indent += bulletIndent
        }
        const lines = linesMapped(itemRaw)
        if (itemRaw.value.endsWith('\n')) lines.pop()
        let lineOffset = lines[0].value.length
        for (let i = 1; i < lines.length; i++) {
            let next = lines[i]
            if (pedantic)
                next = replaceMapped(next, rules.other.listReplaceNesting, (_match, input) =>
                    replacementMapped('  ', input)
                )
            const expanded = pedantic
                ? next
                : replaceMapped(next, rules.other.leadingSpaceTab, (_match, input) =>
                      replaceMapped(input, rules.other.tabCharGlobal, (_m, tab) =>
                          replacementMapped('    ', tab)
                      )
                  )
            const dedented =
                expanded.value.search(rules.other.nonSpaceChar) >= indent || !next.value.trim()
            contents = concatMapped(
                contents,
                newline(itemRaw, lineOffset),
                dedented ? sliceMapped(expanded, indent) : next
            )
            lineOffset += lines[i].value.length + 1
        }
        if (index === token.items.length - 1) contents = trimMapped(contents, true)
        // item.text has already had a task marker removed, but its block frame did not.
        return contents
    })
}
export const tableCells = (row: MappedView, count?: number): MappedView[] => {
    const cells: MappedView[] = []
    let at = 0
    for (let i = 0; i < row.value.length; i++) {
        if (row.value[i] !== '|') continue
        let slashes = 0
        for (let j = i - 1; j >= 0 && row.value[j] === '\\'; j--) slashes++
        if (slashes % 2) continue
        cells.push(sliceMapped(row, at, i))
        at = i + 1
    }
    cells.push(sliceMapped(row, at))
    if (!cells[0].value.trim()) cells.shift()
    if (cells.length && !cells.at(-1)!.value.trim()) cells.pop()
    if (count) {
        cells.splice(count)
        while (cells.length < count) cells.push(empty())
    }
    return cells.map((cell) =>
        replaceMapped(trimMapped(cell), /\\\|/g, (_match, input) => sliceMapped(input, 1))
    )
}

export const normalizeBlock = (view: MappedView, pedantic: boolean): MappedView =>
    pedantic
        ? replaceMapped(
              replaceMapped(view, /\t/g, (_match, input) => replacementMapped('    ', input)),
              /^ +$/gm,
              () => empty()
          )
        : view

export const createTextAdapters = (rules: RuleSet, pedantic: boolean) => {
    const adaptParagraph = (event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const token = event.token!
        let text: MappedView | undefined
        if (event.rule === 'reflink' && token.type !== 'text') {
            const cap = rules.inline.reflink.exec(raw.value) ?? rules.inline.nolink.exec(raw.value)!
            text = unescapeLabel(
                sliceMapped(
                    raw,
                    raw.value[0] === '!' ? 2 : 1,
                    (raw.value[0] === '!' ? 2 : 1) + cap[1].length
                ),
                rules
            )
        } else text = sliceMapped(raw, 0, event.text!.length)
        if (event.rule === 'inlineText' && !(token as Tokens.Text).escaped)
            text = decodeNumeric(raw, rules)
        return text
    }
    const adaptEmStrong = (event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const token = event.token!

        const width =
            token.type === 'strong' ? 2 : token.type === 'em' ? 1 : /^~+/.exec(raw.value)![0].length
        const text = sliceMapped(raw, width, raw.value.length - width)
        return text
    }
    const adaptLink = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const cap = rules.inline.link.exec(raw.value)!
        const start = raw.value[0] === '!' ? 2 : 1
        const text = unescapeLabel(sliceMapped(raw, start, start + cap[1].length), rules)
        return text
    }
    const adaptHtml = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const text = raw
        return text
    }
    const adaptEscape = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const text = sliceMapped(raw, 1)
        return text
    }
    const adaptAutolink = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const text = sliceMapped(raw, 1, raw.value.length - 1)
        return text
    }
    const adaptUrl = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const text = raw
        return text
    }
    const adaptHeading = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        let text: MappedView | undefined

        const cap = new RegExp(rules.block.heading.source, rules.block.heading.flags + 'd').exec(
            raw.value
        )!
        const range = cap.indices![2]!
        text = trimMapped(sliceMapped(raw, range[0], range[1]))
        if (rules.other.endingHash.test(text.value)) {
            const end = text.value.replace(/#+$/, '').length
            if (pedantic || !end || rules.other.endingSpaceTabChar.test(text.value.slice(0, end)))
                text = trimMapped(sliceMapped(text, 0, end))
        }
        return text
    }
    const adaptLheading = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const cap = rules.block.lheading.exec(raw.value)!
        const text = trimMapped(sliceMapped(raw, 0, cap[1].length))
        return text
    }
    const adaptCodespan = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        let text: MappedView | undefined

        const width = /^`+/.exec(raw.value)![0].length
        text = replaceMapped(
            sliceMapped(raw, width, raw.value.length - width),
            rules.other.newLineCharGlobal,
            (_match, input) => replacementMapped(' ', input)
        )
        if (
            rules.other.nonSpaceChar.test(text.value) &&
            text.value.startsWith(' ') &&
            text.value.endsWith(' ')
        )
            text = sliceMapped(text, 1, text.value.length - 1)
        return text
    }
    const adaptCode = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        const text = replaceMapped(raw, rules.other.codeRemoveIndent, () => empty())
        return text
    }
    const adaptFences = (_event: GrammarEvent, raw: MappedView): MappedView | undefined => {
        let text: MappedView | undefined

        const cap = new RegExp(rules.block.fences.source, rules.block.fences.flags + 'd').exec(
            raw.value
        )!
        const range = cap.indices![3]
        text = range ? sliceMapped(raw, range[0], range[1]) : empty()
        const indent = rules.other.indentCodeCompensation.exec(raw.value)?.[1].length ?? 0
        text = replaceMapped(text, /^ +/gm, (_match, input) =>
            sliceMapped(input, Math.min(input.value.length, indent))
        )
        return text
    }
    const textAdapters: Record<
        string,
        (_event: GrammarEvent, _raw: MappedView) => MappedView | undefined
    > = {
        paragraph: adaptParagraph,
        text: adaptParagraph,
        inlineText: adaptParagraph,
        reflink: adaptParagraph,
        emStrong: adaptEmStrong,
        del: adaptEmStrong,
        link: adaptLink,
        html: adaptHtml,
        tag: adaptHtml,
        escape: adaptEscape,
        autolink: adaptAutolink,
        url: adaptUrl,
        heading: adaptHeading,
        lheading: adaptLheading,
        codespan: adaptCodespan,
        code: adaptCode,
        fences: adaptFences
    }
    return textAdapters
}
