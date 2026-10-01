import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

const router = Router();

const UPLOAD_DIR = process.env.CRM_UPLOAD_DIR || path.resolve(process.cwd(), 'data/uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ---------- 上传 ----------
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return fail(res, '未选择文件');

  const { relType, relId } = req.body;
  if (!relType || !relId) return fail(res, '缺少关联类型或关联ID');

  const id = `att-${nanoid(8)}`;
  const uploader = req.user?.id || '';

  db.prepare(
    `INSERT INTO attachments (id, rel_type, rel_id, filename, file_size, file_type, file_path, uploader)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, relType, relId, req.file.originalname, req.file.size, req.file.mimetype, req.file.filename, uploader);

  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
  success(res, attachment, '上传成功');
});

// ---------- 列表 ----------
router.get('/', authMiddleware, (req, res) => {
  const { relType, relId } = req.query as any;
  if (!relType || !relId) return fail(res, '缺少关联类型或关联ID');

  const rows = db.prepare(
    `SELECT a.*, u.name as uploader_name FROM attachments a
     LEFT JOIN users u ON a.uploader = u.id
     WHERE a.rel_type = ? AND a.rel_id = ? ORDER BY a.created_at DESC`
  ).all(relType, relId) as any[];

  const list = rows.map((r) => ({
    id: r.id,
    relType: r.rel_type,
    relId: r.rel_id,
    filename: r.filename,
    fileSize: r.file_size,
    fileType: r.file_type,
    filePath: r.file_path,
    uploader: r.uploader,
    uploaderName: r.uploader_name,
    createdAt: r.created_at,
    url: `/api/attachments/${r.id}/download`,
  }));

  success(res, list);
});

// ---------- 下载 ----------
router.get('/:id/download', authMiddleware, (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;
  if (!att) return fail(res, '附件不存在', 404, 404);

  const filePath = path.join(UPLOAD_DIR, att.file_path);
  if (!fs.existsSync(filePath)) return fail(res, '文件不存在', 404, 404);

  res.download(filePath, att.filename);
});

// ---------- 删除 ----------
router.delete('/:id', authMiddleware, (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;
  if (!att) return fail(res, '附件不存在', 404, 404);

  const filePath = path.join(UPLOAD_DIR, att.file_path);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }

  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  success(res, null, '附件已删除');
});

export default router;
