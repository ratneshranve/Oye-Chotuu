import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const uploadMiddleware = read('../src/middleware/upload.js');
const uploadRoutes = read('../src/modules/uploads/routes/upload.routes.js');

test('shared upload middleware enforces file type and size limits', () => {
  assert.ok(uploadMiddleware.includes("import multer from 'multer';"));
  assert.ok(uploadMiddleware.includes('const IMAGE_MIME_TYPES = new Set'));
  assert.ok(uploadMiddleware.includes('const ALLOWED_MIME_TYPES = new Set'));
  assert.ok(uploadMiddleware.includes("'image/jpeg'"));
  assert.ok(uploadMiddleware.includes("'image/png'"));
  assert.ok(uploadMiddleware.includes("'image/webp'"));
  assert.ok(uploadMiddleware.includes("'video/mp4'"));
  assert.ok(uploadMiddleware.includes('limits: { fileSize: 25 * MB, files: 20 }'));
  assert.ok(uploadMiddleware.includes('limits: { fileSize: 5 * MB, files: 1 }'));
  assert.ok(uploadMiddleware.includes("new Error('Unsupported file type')"));
  assert.ok(uploadMiddleware.includes('error.statusCode = 400'));
});

test('standalone image upload endpoint requires auth and image-only upload handling', () => {
  assert.ok(uploadRoutes.includes("import { imageUpload } from '../../../middleware/upload.js';"));
  assert.ok(uploadRoutes.includes("import { authMiddleware } from '../../../core/auth/auth.middleware.js';"));
  assert.ok(uploadRoutes.includes("import { requireRoles } from '../../../core/roles/role.middleware.js';"));
  assert.ok(uploadRoutes.includes("const uploadRoles = requireRoles('ADMIN', 'SUB_ADMIN', 'USER', 'RESTAURANT', 'DELIVERY_PARTNER', 'SELLER')"));
  assert.ok(uploadRoutes.includes("router.post('/image', authMiddleware, uploadRoles, imageUpload.single('file'), async"));
});

test('standalone image upload response contract is preserved', () => {
  assert.ok(uploadRoutes.includes("message: 'No file provided'"));
  assert.ok(uploadRoutes.includes("message: 'Image uploaded successfully'"));
  assert.ok(uploadRoutes.includes('data: {'));
  assert.ok(uploadRoutes.includes('url,'));
  assert.ok(uploadRoutes.includes('publicId: null'));
});