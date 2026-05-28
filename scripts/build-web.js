const fs = require('fs/promises')
const path = require('path')
const esbuild = require('esbuild')

const root = path.join(__dirname, '..')
const outDir = path.join(root, 'web-dist')
const assetsDir = path.join(root, 'assets')

async function build() {
  await fs.mkdir(assetsDir, { recursive: true })
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'dashboard-layout.jsx')],
    bundle: true,
    outfile: path.join(assetsDir, 'dashboard-layout.js'),
    format: 'iife',
    target: ['es2019'],
    jsx: 'automatic'
  })
  const dashboardCss = await Promise.all([
    fs.readFile(path.join(root, 'node_modules', 'react-grid-layout', 'css', 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'node_modules', 'react-resizable', 'css', 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'dashboard-layout-extra.css'), 'utf8')
  ])
  await fs.writeFile(path.join(assetsDir, 'dashboard-layout.css'), dashboardCss.join('\n'), 'utf8')
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })
  await fs.copyFile(path.join(root, 'index.html'), path.join(outDir, 'index.html'))
  await fs.cp(assetsDir, path.join(outDir, 'assets'), { recursive: true })
  await fs.writeFile(
    path.join(outDir, 'config.js'),
    `window.FINANCASA_CONFIG = ${JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://fzozyfzihfltgebmufsp.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AsxuXAWSH1_6a8KHgqi7sw_7OjYbBC2'
    }, null, 2)};\n`,
    'utf8'
  )
  await fs.writeFile(path.join(outDir, '_redirects'), '/* /index.html 200\n', 'utf8')
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
