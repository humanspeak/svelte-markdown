<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
</script>

<footer
    class="border-border bg-background text-foreground flex items-center justify-center border-t py-6 text-sm"
>
    <div class="mx-auto flex max-w-7xl gap-2 px-4 text-center">
        Made with
        <motion.span
            aria-label="Love"
            animate={{
                scale: [1, 1.2, 1, 1.1, 1]
            }}
            transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: 'easeInOut'
            }}
            style="transform-origin: center center;"
            class="inline-block origin-center align-middle leading-none"
        >
            ❤️
        </motion.span>
        by
        <a
            href="https://humanspeak.com"
            target="_blank"
            class="text-brand-500 hover:text-brand-600 hover:underline"
        >
            Humanspeak
        </a>
    </div>
</footer>
