import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './db.js';
import seedIfEmpty from './seed.js';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import contactsRouter from './routes/contacts.js';
import opportunitiesRouter from './routes/opportunities.js';
import projectsRouter from './routes/projects.js';
import followupsRouter from './routes/followups.js';
import quotationsRouter from './routes/quotations.js';
import productsRouter from './routes/products.js';
import contractsRouter from './routes/contracts.js';
import attachmentsRouter from './routes/attachments.js';
import statsRouter from './routes/stats.js';
import { logger } from '@lark-apaas/client-toolkit-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 种子数据
seedIfEmpty();

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/followups', followupsRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/products', productsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/stats', statsRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ code: 0, data: { status: 'ok', timestamp: Date.now() } });
});

// 静态文件（生产环境，前端构建后的产物）
const distDir = path.resolve(__dirname, '../dist/output');
app.use(express.static(distDir));

// SPA 回退
app.use((_req, res, next) => {
  if (_req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

// 全局错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('[Error]', String(err.message || err));
  res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  logger.info(`[Server] CRM 后端服务已启动: http://localhost:${PORT}`);
  logger.info(`[Server] API 前缀: /api`);
});
