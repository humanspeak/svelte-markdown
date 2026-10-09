import type { Snippet } from 'svelte'
import { expectTypeOf, it } from 'vitest'
import type { StreamingTextMetadata, SvelteMarkdownProps } from '../../index.js'
import type { KatexSnippetOverrides, KatexSnippetProps } from '../index.js'
import type {
    KatexSnippetOverrides as SubpathOverrides,
    KatexSnippetProps as SubpathProps
} from './index.js'

it('exports the same snippet types from both extension entry points', () => {
    expectTypeOf<KatexSnippetProps>().toEqualTypeOf<SubpathProps>()
    expectTypeOf<KatexSnippetOverrides>().toEqualTypeOf<SubpathOverrides>()
    expectTypeOf<KatexSnippetProps['text']>().toEqualTypeOf<string>()
    expectTypeOf<KatexSnippetProps['displayMode']>().toEqualTypeOf<boolean>()
    expectTypeOf<KatexSnippetProps['streamingText']>().toEqualTypeOf<
        StreamingTextMetadata | undefined
    >()
    expectTypeOf<KatexSnippetOverrides['inlineKatex']>().toEqualTypeOf<
        Snippet<[KatexSnippetProps]> | undefined
    >()
    expectTypeOf<KatexSnippetOverrides['blockKatex']>().toEqualTypeOf<
        Snippet<[KatexSnippetProps]> | undefined
    >()
})

it('allows wrapper overrides while keeping core and wrapper prop names strict', () => {
    type WrapperProps = Omit<SvelteMarkdownProps, 'extensions'> & KatexSnippetOverrides
    expectTypeOf<KatexSnippetOverrides>().toExtend<Partial<WrapperProps>>()
    expectTypeOf<'inlineKatex'>().not.toExtend<keyof SvelteMarkdownProps>()
    expectTypeOf<'blockKatex'>().not.toExtend<keyof SvelteMarkdownProps>()
    expectTypeOf<string>().not.toExtend<keyof SvelteMarkdownProps>()
    expectTypeOf<'inlineKaTex'>().not.toExtend<keyof WrapperProps>()
    expectTypeOf<'soruce'>().not.toExtend<keyof WrapperProps>()
})
