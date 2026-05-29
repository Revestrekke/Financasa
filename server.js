const http = require('http')
const fs = require('fs')
const path = require('path')

const port = Number(process.env.PORT) || 3000
const distDir = path.join(__dirname, 'web-dist')
const rootDir = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : __dirname

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
}

function sendConfig(res) {
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://fzozyfzihfltgebmufsp.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_AsxuXAWSH1_6a8KHgqi7sw_7OjYbBC2'
  }

  res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
  res.end(`window.FINANCASA_CONFIG = ${JSON.stringify(config, null, 2)};\n`)
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }

    res.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
    })
    res.end(data)
  })
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])

  if (urlPath === '/config.js') {
    sendConfig(res)
    return
  }

  const relativePath = urlPath === '/' ? 'index.html' : urlPath.slice(1)
  const requestedPath = path.resolve(rootDir, relativePath)

  if (!requestedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  fs.stat(requestedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(res, requestedPath)
      return
    }

    sendFile(res, path.join(rootDir, 'index.html'))
  })
}).listen(port, () => {
  console.log(`FinanCasa web server listening on port ${port}`)
})
