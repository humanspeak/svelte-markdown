import { browser } from '$app/environment'
import posthog from 'posthog-js'
import { onMount } from 'svelte'

onMount(() => {
    if (browser) {
        posthog.init('phc_3Yf0JxhoUoiBaevrHPecsERricralYoOS4V0PEoeFfI', {
            /* trunk-ignore(eslint/camelcase) */
            api_host: 'https://us.i.posthog.com',
            /* trunk-ignore(eslint/camelcase) */
            person_profiles: 'always' // or 'always' to create profiles for anonymous users as well
        })
    }
})
