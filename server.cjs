// CRM 客户关系管理系统 - 本地静态服务器
// 禁用浏览器缓存，保证每次刷新都拿到最新构建版本
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 18789;
const ROOT = path.join(__dirname, 'dist-local');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '/index.html') urlPath = '/index.local.html';

  const filePath = path.join(ROOT, urlPath);
  // 防止路径逃逸
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store', // 关键：禁用缓存，更新后刷新页面即可生效
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('CRM 客户关系管理系统已启动');
  console.log('访问地址: http://localhost:' + PORT);
  console.log('按 Ctrl+C 停止服务');
});
