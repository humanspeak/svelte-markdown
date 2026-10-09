import type { Token } from 'marked'

/** UTF-16 source coordinates, independent of token raw/sourceLength/render keys. */
export interface SourceInterval {
    readonly start: number
    readonly end: number
}
export interface MappingRun {
    readonly outputStart: number
    readonly outputEnd: number
    readonly mode: 'copy' | 'replacement' | 'synthetic'
    readonly sources: readonly SourceInterval[]
}
export interface MappedView {
    readonly value: string
    readonly runs: readonly MappingRun[]
}
export interface ProvenanceNode {
    readonly exact: boolean
    readonly sourceSpans: readonly SourceInterval[]
    readonly raw?: MappedView
    readonly text?: MappedView
    readonly tokens?: readonly ProvenanceNode[]
    readonly items?: readonly ProvenanceNode[]
    readonly header?: readonly ProvenanceNode[]
    readonly rows?: readonly (readonly ProvenanceNode[])[]
}
export const mappedSource = (value: string, base = 0): MappedView => ({
    value,
    runs: value.length
        ? [
              {
                  outputStart: 0,
                  outputEnd: value.length,
                  mode: 'copy',
                  sources: [{ start: base, end: base + value.length }]
              }
          ]
        : []
})
export const sliceMapped = (view: MappedView, start = 0, end = view.value.length): MappedView => {
    const runs: MappingRun[] = []
    for (const run of view.runs) {
        const left = Math.max(start, run.outputStart)
        const right = Math.min(end, run.outputEnd)
        if (left >= right) continue
        runs.push({
            ...run,
            outputStart: left - start,
            outputEnd: right - start,
            sources:
                run.mode === 'copy'
                    ? [
                          {
                              start: run.sources[0].start + left - run.outputStart,
                              end: run.sources[0].start + right - run.outputStart
                          }
                      ]
                    : run.sources
        })
    }
    return { value: view.value.slice(start, end), runs }
}
export const concatMapped = (...views: MappedView[]): MappedView => {
    let value = ''
    const runs: MappingRun[] = []
    for (const view of views) {
        for (const run of view.runs) {
            const next = {
                ...run,
                outputStart: run.outputStart + value.length,
                outputEnd: run.outputEnd + value.length
            }
            const last = runs.at(-1)
            if (
                last?.mode === 'copy' &&
                next.mode === 'copy' &&
                last.outputEnd === next.outputStart &&
                last.sources[0].end === next.sources[0].start
            ) {
                runs[runs.length - 1] = {
                    ...last,
                    outputEnd: next.outputEnd,
                    sources: [{ start: last.sources[0].start, end: next.sources[0].end }]
                }
            } else runs.push(next)
        }
        value += view.value
    }
    return { value, runs }
}
export const replacementMapped = (value: string, input: MappedView): MappedView => ({
    value,
    runs: value.length
        ? [
              {
                  outputStart: 0,
                  outputEnd: value.length,
                  mode: input.runs.length ? 'replacement' : 'synthetic',
                  sources: input.runs.flatMap((run) => run.sources)
              }
          ]
        : []
})
export const trimMapped = (view: MappedView, endOnly = false): MappedView => {
    const start = endOnly ? 0 : view.value.length - view.value.trimStart().length
    return sliceMapped(view, start, view.value.trimEnd().length)
}
/** Replace by grammar match positions. Never reconcile by repeated text values. */
export const replaceMapped = (
    view: MappedView,
    pattern: RegExp,
    replacement: (_match: RegExpExecArray, _input: MappedView) => MappedView
): MappedView => {
    const re = new RegExp(pattern.source, pattern.flags)
    const parts: MappedView[] = []
    let cursor = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(view.value))) {
        parts.push(
            sliceMapped(view, cursor, match.index),
            replacement(match, sliceMapped(view, match.index, match.index + match[0].length))
        )
        cursor = match.index + match[0].length
        if (!re.global) break
        if (!match[0].length) throw new Error('Provenance adapter requires consuming replacements')
    }
    parts.push(sliceMapped(view, cursor))
    return concatMapped(...parts)
}
export const assertMappedValue = (view: MappedView, expected: string, rule: string): MappedView => {
    if (view.value !== expected)
        throw new Error(
            `Provenance adapter drift (${rule}): ${JSON.stringify(view.value)} != ${JSON.stringify(expected)}`
        )
    return view
}

type Node = { tokens?: Node[]; items?: Node[]; header?: Node[]; rows?: Node[][] }
/** A collector is explicitly allocated by the opt-in caller. Nothing is stamped on tokens. */
export class ProvenanceCollector {
    private readonly sidecars = new WeakMap<object, ProvenanceNode>()
    private readonly complete = new WeakSet<object>()
    private readonly parents = new WeakMap<object, Set<WeakRef<object>>>()
    private readonly references = new WeakMap<object, WeakRef<object>>()
    readonly counters = {
        mappedInputUnits: 0,
        projectedLeaves: 0,
        boundNodes: 0,
        capturedNodes: 0,
        captureCacheHits: 0
    }
    /** Tracer and cleanup call this before changing mappings or child topology. */
    invalidate(node: object): void {
        if (!this.complete.delete(node)) return
        this.parents.get(node)?.forEach((reference) => {
            const parent = reference.deref()
            if (parent) this.invalidate(parent)
            else this.parents.get(node)?.delete(reference)
        })
    }
    private attach(parent: object, children: readonly object[]): void {
        let reference = this.references.get(parent)
        if (!reference) this.references.set(parent, (reference = new WeakRef(parent)))
        for (const child of children) {
            let parents = this.parents.get(child)
            if (!parents) this.parents.set(child, (parents = new Set()))
            parents.add(reference)
        }
    }
    get(node: object): ProvenanceNode | undefined {
        return this.sidecars.get(node)
    }
    set(node: object, value: ProvenanceNode): void {
        this.invalidate(node)
        this.sidecars.set(node, value)
    }
    transfer(from: object, to: object): void {
        const value = this.get(from)
        if (value) this.set(to, value)
    }
    /** Capture occurrences before adoption, including occurrences of identical tokens at different offsets. */
    capture(tokens: readonly object[]): readonly ProvenanceNode[] {
        return tokens.map((token) => this.captureNode(token as Node))
    }
    private captureNode(node: Node): ProvenanceNode {
        if (this.complete.has(node)) {
            this.counters.captureCacheHits++
            return this.get(node)!
        }
        this.counters.capturedNodes++
        for (const key of ['tokens', 'items', 'header'] as const) {
            if (Array.isArray(node[key])) this.attach(node, node[key])
        }
        node.rows?.forEach((row) => this.attach(node, row))
        const own = this.get(node) ?? { exact: false, sourceSpans: [] }
        if (own.text && !Array.isArray(node.tokens)) this.counters.projectedLeaves++
        const result: ProvenanceNode = {
            exact: own.exact,
            sourceSpans: own.sourceSpans,
            ...(own.raw ? { raw: own.raw } : {}),
            ...(own.text ? { text: own.text } : {}),
            ...(Array.isArray(node.tokens) ? { tokens: this.capture(node.tokens) } : {}),
            ...(Array.isArray(node.items) ? { items: this.capture(node.items) } : {}),
            ...(Array.isArray(node.header) ? { header: this.capture(node.header) } : {}),
            ...(node.rows ? { rows: node.rows.map((row) => this.capture(row)) } : {})
        }
        this.sidecars.set(node, result)
        this.complete.add(node)
        return result
    }
    /** Paired walk of changed roots only; bind AFTER clone/reuse, using pre-adoption occurrences. */
    bind(tokens: readonly Token[], occurrences: readonly ProvenanceNode[], start = 0): void {
        const visit = (node: Node, occurrence: ProvenanceNode) => {
            if (this.complete.has(node) && this.get(node) === occurrence) return
            this.counters.boundNodes++
            this.set(node, occurrence)
            for (const key of ['tokens', 'items', 'header'] as const) {
                const children = node[key],
                    maps = occurrence[key]
                if (Array.isArray(children) && maps)
                    children.forEach((child, index) => visit(child, maps[index]))
            }
            node.rows?.forEach((row, i) =>
                row.forEach((cell, j) => {
                    if (occurrence.rows) visit(cell, occurrence.rows[i][j])
                })
            )
            for (const key of ['tokens', 'items', 'header'] as const) {
                if (Array.isArray(node[key])) this.attach(node, node[key])
            }
            node.rows?.forEach((row) => this.attach(node, row))
            this.complete.add(node)
        }
        for (let i = start; i < tokens.length; i++) visit(tokens[i] as Node, occurrences[i])
    }
}
