<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
</script>

<footer>
    <p class="w-full text-center">
        Made with <motion.span
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
            <i class="fa-duotone fa-heart"></i>
        </motion.span> by
        <a class="humanspeak" target="_blank" href="https://humanspeak.com">Humanspeak</a>
    </p>
</footer>

<style>
    p {
        margin: 0 !important;
    }

    .fa-heart {
        --fa-secondary-color: red;
    }
</style>
