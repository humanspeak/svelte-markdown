import type { BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
import { getContext, setContext } from 'svelte'

export const BreadcrumbContextSymbol = Symbol('breadcrumbs')

export const getBreadcrumbContext = (): BreadcrumbContext | undefined => {
    return getContext(BreadcrumbContextSymbol)
}

export const setBreadcrumbContext = (context: BreadcrumbContext): void => {
    setContext(BreadcrumbContextSymbol, context)
}
