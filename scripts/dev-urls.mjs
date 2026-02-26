/**
 * Discovers dev server ports from Vite configs and package.json scripts,
 * then prints a formatted table of URLs. Stays alive for mprocs sidebar.
 * Press a number key to copy the corresponding URL to clipboard.
 */

import { execSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const YELLOW = '\x1b[33m'

/** Read the "name" field from the nearest package.json in `dir`. */
function readPkgName(dir) {
    try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        return pkg.name || dir
    } catch {
        return dir
    }
}

/** Copy text to clipboard (cross-platform). */
function copyToClipboard(text) {
    const os = platform()
    let cmd
    if (os === 'darwin') {
        cmd = 'pbcopy'
    } else if (os === 'win32') {
        cmd = 'clip'
    } else {
        cmd = 'xclip -selection clipboard'
    }
    try {
        execSync(cmd, { input: text, stdio: ['pipe', 'ignore', 'ignore'] })
    } catch {
        console.warn('⚠ Clipboard utility not found. Install xclip or wl-copy.')
    }
}

/** @type {Map<string, {name: string, port: number, source: string}>} */
const discovered = new Map()

// ── Strategy 1: Vite configs ────────────────────────────────────────────────
const viteConfigs = globSync('**/vite.config.{ts,js,mts,mjs}', {
    cwd: ROOT,
    exclude: (p) => p.includes('node_modules')
})

for (const rel of viteConfigs) {
    const abs = join(ROOT, rel)
    const dir = dirname(abs)
    const content = readFileSync(abs, 'utf8')
    const match = content.match(/port:\s*(\d+)/)
    if (!match) continue

    const port = Number(match[1])
    const name = readPkgName(dir)
    discovered.set(dir, { name, port, source: 'vite' })
}

// ── Strategy 2: --port= flags in package.json scripts ──────────────────────
const pkgJsons = globSync('**/package.json', {
    cwd: ROOT,
    exclude: (p) => p.includes('node_modules')
})

for (const rel of pkgJsons) {
    const abs = join(ROOT, rel)
    const dir = dirname(abs)

    // Skip if already found via vite config (prefer vite entry)
    if (discovered.has(dir)) continue

    try {
        const pkg = JSON.parse(readFileSync(abs, 'utf8'))
        if (!pkg.scripts) continue

        for (const [key, cmd] of Object.entries(pkg.scripts)) {
            if (typeof cmd !== 'string') continue
            const match = cmd.match(/--port[=\s]+(\d+)/)
            if (!match) continue

            const port = Number(match[1])
            const label = `${pkg.name || dir}:${key}`
            discovered.set(`${dir}:${key}`, { name: label, port, source: 'script' })
        }
    } catch {
        // skip malformed package.json
    }
}

// ── Output ──────────────────────────────────────────────────────────────────
const entries = [...discovered.values()].sort((a, b) => a.port - b.port)

function printTable(statusLine = '') {
    console.clear()
    console.log()
    console.log(`${BOLD}  Dev servers${RESET}`)
    console.log(`${DIM}  ${'─'.repeat(50)}${RESET}`)

    if (entries.length === 0) {
        console.log('  No dev server ports discovered.')
    } else {
        const maxName = Math.max(...entries.map((e) => e.name.length))
        entries.forEach(({ name, port }, i) => {
            const url = `http://localhost:${port}`
            console.log(
                `  ${YELLOW}[${i + 1}]${RESET}  ${GREEN}●${RESET}  ${name.padEnd(maxName)}  ${CYAN}${url}${RESET}`
            )
        })
    }

    console.log(`${DIM}  ${'─'.repeat(50)}${RESET}`)
    if (statusLine) {
        console.log(`  ${statusLine}`)
    } else {
        console.log(`${DIM}  Press 1-${entries.length} to copy URL to clipboard${RESET}`)
    }
    console.log()
}

printTable()

// ── Keyboard listener ───────────────────────────────────────────────────────
if (entries.length > 0 && process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key) => {
        const num = Number(key)
        if (num >= 1 && num <= entries.length) {
            const { name, port } = entries[num - 1]
            const url = `http://localhost:${port}`
            copyToClipboard(url)
            printTable(`${GREEN}Copied ${url} (${name}) to clipboard${RESET}`)
        }
    })
}
