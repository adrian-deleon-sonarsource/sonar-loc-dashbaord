'use strict';
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

const PORT     = parseInt(process.env.PORT || '3000', 10);
const INSECURE = process.argv.includes('--insecure') || process.env.INSECURE === '1';
const HTML     = path.join(__dirname, 'sonarqube-dashboard.html');

if (INSECURE) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('Warning: TLS certificate verification disabled (--insecure).');
}

http.createServer((req, res) => {
  const { pathname, search } = new URL(req.url, `http://localhost:${PORT}`);

  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(HTML, (err, data) => {
      if (err) { res.writeHead(500); res.end('Cannot read sonarqube-dashboard.html'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  if (pathname.startsWith('/proxy/')) {
    const sonarBase  = (req.headers['x-sonar-url']  || '').replace(/\/+$/, '');
    const sonarToken =  req.headers['x-sonar-token'] || '';

    if (!sonarBase) {
      res.writeHead(400);
      res.end(JSON.stringify({ errors: [{ msg: 'Missing X-Sonar-Url header' }] }));
      return;
    }

    const apiPath = pathname.slice('/proxy'.length) + (search || '');
    let target;
    try { target = new URL(apiPath, sonarBase + '/'); }
    catch {
      res.writeHead(400);
      res.end(JSON.stringify({ errors: [{ msg: 'Invalid SonarQube URL' }] }));
      return;
    }

    const fwdHeaders = { Accept: 'application/json' };
    if (sonarToken) {
      fwdHeaders['Authorization'] = 'Basic ' + Buffer.from(sonarToken + ':').toString('base64');
    }

    const lib = target.protocol === 'https:' ? https : http;
    const proxyReq = lib.request(
      {
        hostname: target.hostname,
        port:     target.port || (target.protocol === 'https:' ? 443 : 80),
        path:     target.pathname + target.search,
        method:   'GET',
        headers:  fwdHeaders,
      },
      proxyRes => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', err => {
      if (!res.headersSent) res.writeHead(502);
      res.end(JSON.stringify({ errors: [{ msg: `Proxy error: ${err.message}` }] }));
    });

    proxyReq.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');

}).listen(PORT, '127.0.0.1', () => {
  console.log(`\nSonarQube Dashboard  →  http://localhost:${PORT}\n`);
  console.log('Press Ctrl+C to stop.\n');
});
