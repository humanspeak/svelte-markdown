// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

// Side-effect CSS imports from fontsource packages have no .d.ts entry.
declare module '@fontsource-variable/inter'
declare module '@fontsource-variable/jetbrains-mono'

export {}
