// Development server: serves the built site, rebuilds when anything under
// src/ changes, and reloads the browser by itself.
//
//   npm run dev
//
// No dependencies. The reload works over Server-Sent Events: a few lines of
// script are injected into each HTML response as it is served, never written
// to disk, so nothing of this reaches the built output or the deployed site.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const root = __dirname;
const buildDir = path.join(root, 'build');
const watchDir = path.join(root, 'src');
const port = process.env.PORT || 3000;

const clients = new Set();
let building = false;
let queued = false;

// --- Build -------------------------------------------------------------------

function build() {
  if (building) {
    queued = true;
    return;
  }
  building = true;

  const started = Date.now();
  const child = spawn(process.execPath, [path.join(root, 'build.js')], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let out = '';
  child.stdout.on('data', d => (out += d));
  child.stderr.on('data', d => (out += d));

  child.on('close', code => {
    building = false;
    const ms = Date.now() - started;

    if (code === 0) {
      // Only the summary line; the full report would drown the log on every
      // keystroke-triggered rebuild.
      const summary = out.split('\n').find(l => l.startsWith('Built')) || 'Built';
      console.log(`  ${summary} (${ms}ms)`);
      broadcast('reload');
    } else {
      console.error('\n  Build failed:\n');
      console.error(out.trim().split('\n').map(l => '  ' + l).join('\n'));
      console.error('');
      // Push the error to the browser so you see it without switching windows.
      broadcast('error:' + out.trim().split('\n').slice(0, 6).join(' | '));
    }

    if (queued) {
      queued = false;
      build();
    }
  });
}

function broadcast(message) {
  for (const res of clients) res.write(`data: ${message}\n\n`);
}

// --- Watch -------------------------------------------------------------------

let timer = null;
function schedule(file) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`\n  changed: ${path.relative(root, file)}`);
    build();
  }, 120); // editors write in bursts; coalesce them
}

for (const target of [watchDir, path.join(root, 'build.js')]) {
  fs.watch(target, { recursive: target === watchDir }, (_, filename) => {
    if (!filename) return;
    if (/(^|\/)(\.|~)|\.swp$|\.tmp$/.test(filename)) return; // editor scratch files
    schedule(path.join(target, filename));
  });
}

// --- Serve -------------------------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

const RELOAD_SCRIPT = `
<script>
  (function () {
    var es = new EventSource('/__dev');
    es.onmessage = function (e) {
      if (e.data === 'reload') location.reload();
      else if (e.data.indexOf('error:') === 0) {
        console.error('[build] ' + e.data.slice(6));
        document.title = '⚠ ' + document.title.replace(/^⚠ /, '');
      }
    };
  })();
</script>
`;

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);

    if (url === '/__dev') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // No clean-URL rewriting: GitHub Pages does not do it either, and pretending
    // otherwise is how relative links come to work locally and break deployed.
    let file = path.join(buildDir, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');

    fs.readFile(file, (err, data) => {
      if (err) {
        const notFound = path.join(buildDir, '404.html');
        if (fs.existsSync(notFound)) {
          res.writeHead(404, { 'Content-Type': TYPES['.html'] });
          return res.end(
            fs.readFileSync(notFound, 'utf-8').replace('</body>', RELOAD_SCRIPT + '</body>')
          );
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found: ' + url);
      }

      const ext = path.extname(file);
      const type = TYPES[ext] || 'application/octet-stream';

      if (ext === '.html') {
        const body = data.toString('utf-8').replace('</body>', RELOAD_SCRIPT + '</body>');
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        return res.end(body);
      }

      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`\n  Watching ${path.relative(root, watchDir)}/`);
    console.log(`  http://localhost:${port}/en/index.html\n`);
    build();
  });
