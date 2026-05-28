const fs = require('fs/promises')
const path = require('path')

const root = path.join(__dirname, '..')
const outDir = path.join(root, 'web-dist')

async function build() {
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })
  await fs.copyFile(path.join(root, 'index.html'), path.join(outDir, 'index.html'))
  await fs.writeFile(path.join(outDir, '_redirects'), '/* /index.html 200\n', 'utf8')
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
