import { browser } from '$app/environment'
import posthog from 'posthog-js'

export const load = async () => {
    if (browser) {
        posthog.init('phc_3Yf0JxhoUoiBaevrHPecsERricralYoOS4V0PEoeFfI', {
            /* trunk-ignore(eslint/camelcase) */
            api_host: 'https://us.i.posthog.com',
            /* trunk-ignore(eslint/camelcase) */
            person_profiles: 'always'
        })
    }
}
