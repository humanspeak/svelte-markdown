import type { SeoContext } from '$lib/components/contexts/Seo/type'
import { getContext, setContext } from 'svelte'

export const SeoContextSymbol = Symbol('seo')

export const getSeoContext = (): SeoContext | undefined => {
    return getContext(SeoContextSymbol)
}

export const setSeoContext = (context: SeoContext): void => {
    setContext(SeoContextSymbol, context)
}
