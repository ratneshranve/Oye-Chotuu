import express from 'express';
import { MilkConfigController } from '../controllers/MilkConfig.controller.js';
import { authMiddleware } from '../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../core/roles/role.middleware.js';

const router = express.Router();
const adminOnly = [authMiddleware, requireRoles('ADMIN', 'SUB_ADMIN')];

// Admin routes
router.post('/', ...adminOnly, MilkConfigController.addConfig);
router.get('/', ...adminOnly, MilkConfigController.getConfigs);
router.put('/:id', ...adminOnly, MilkConfigController.updateConfig);
router.delete('/:id', ...adminOnly, MilkConfigController.removeConfig);

// Public routes
router.get('/public/bootstrap', MilkConfigController.getBootstrap);
router.get('/public/:type', MilkConfigController.getPublicConfigs);

export default router;
