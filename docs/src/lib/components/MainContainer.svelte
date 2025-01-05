<script lang="ts">
    import Header from '$lib/components/base/Header.svelte'

    import '../../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
    import AppSidebar from '$lib/components/base/app-sidebar.svelte'
    import Footer from '$lib/components/base/Footer.svelte'

    const { children } = $props()
</script>

<ModeWatcher />

<Sidebar.Provider open={false}>
    <AppSidebar />
    <div class="flex h-screen w-full flex-col">
        <header class="border-grey sticky top-0 w-full border-b p-4 text-center">
            <Header></Header>
        </header>
        <main class="w-full flex-1 overflow-y-scroll">
            {@render children?.()}
        </main>
        <footer class="border-grey sticky bottom-0 w-full border-t p-2 text-center">
            <Footer></Footer>
        </footer>
    </div>
</Sidebar.Provider>
