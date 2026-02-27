import { read } from '$app/server'
import OG from '$lib/components/shared-link/OG.svelte'
import { decodeMessageData } from '$lib/components/shared-link/utils'
import LatoExtraBold from '$lib/fonts/lato/Lato-ExtraBold.ttf'
import LatoExtraBoldItalic from '$lib/fonts/lato/Lato-ExtraBoldItalic.ttf'
import Lato from '$lib/fonts/lato/Lato-Regular.ttf'
import { normalizeDimensionsForSatori } from '@humanspeak/svelte-satori-fix'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { html as toReactNode } from 'satori-html'
import { render } from 'svelte/server'

const height = 630
const width = 1200

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ params, url }) => {
    const { messageData } = params

    let type: 'og' | 'twitter' = 'og'
    let title = 'Svelte Markdown'
    let description = 'Fast, secure markdown rendering with built-in caching and snippet overrides.'
    let features = ['Svelte 5 Runes', 'TypeScript First', '50-200x Caching', 'Marked Extensions']
    if (messageData) {
        try {
            const parsed = decodeMessageData(messageData)
            if (parsed.type) type = parsed.type
            if (parsed.title) title = parsed.title
            if (parsed.description) description = parsed.description
            if (parsed.features) features = parsed.features
        } catch {
            // ignore
        }
    }

    const result = render(OG, { props: { type, url: url.origin, title, description, features } })
    const element = normalizeDimensionsForSatori(toReactNode(result.body))
    const svg = await satori(element, {
        height,
        width,
        fonts: [
            {
                name: 'lato',
                data: await read(Lato).arrayBuffer(),
                style: 'normal'
            },
            {
                name: 'lato-extrabold',
                data: await read(LatoExtraBold).arrayBuffer(),
                style: 'normal'
            },
            {
                name: 'lato-extrabolditalic',
                data: await read(LatoExtraBoldItalic).arrayBuffer(),
                style: 'italic'
            }
        ]
    })

    const resvg = new Resvg(svg, {
        fitTo: {
            mode: 'width',
            value: width
        }
    })

    const image = resvg.render()
    const body = new Uint8Array(image.asPng())

    return new Response(body, {
        headers: {
            'content-type': 'image/png'
        }
    })
}
