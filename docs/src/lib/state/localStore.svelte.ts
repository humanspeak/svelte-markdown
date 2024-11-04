// https://www.reddit.com/r/sveltejs/comments/1d43d8p/svelte_5_runes_with_localstorage_thanks_to_joy_of/

import { browser } from '$app/environment'

export class LocalStore<T> {
    value = $state<T>() as T
    #key = ''
    #storage: Storage | null = null

    get key() {
        return this.#key
    }

    constructor(key: string, value: T) {
        this.#key = key

        if (browser) {
            this.#storage = localStorage
            const item = this.#storage.getItem(key)
            if (item) {
                this.value = this.deserialize(item)
            } else {
                this.value = value
            }

            $effect(() => {
                this.#storage?.setItem(this.key, this.serialize(this.value))
            })
        } else {
            // Server-side: just use the initial value without storage
            this.value = value
        }
    }

    serialize(value: T): string {
        return JSON.stringify(value)
    }

    deserialize(item: string): T {
        return JSON.parse(item)
    }
}

export function localStore<T>(key: string, value: T) {
    return new LocalStore(key, value)
}
