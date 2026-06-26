import express from 'express';
import { imageUpload } from '../../../middleware/upload.js';
import { uploadImageBuffer } from '../../../services/cloudinary.service.js';
import { authMiddleware } from '../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../core/roles/role.middleware.js';

const router = express.Router();
const uploadRoles = requireRoles('ADMIN', 'SUB_ADMIN', 'USER', 'RESTAURANT', 'DELIVERY_PARTNER', 'SELLER');

// POST /v1/uploads/image
router.post('/image', authMiddleware, uploadRoles, imageUpload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const folder = typeof req.body?.folder === 'string' && req.body.folder.trim()
            ? req.body.folder.trim()
            : 'uploads';

        const url = await uploadImageBuffer(req.file.buffer, folder);

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url,
                publicId: null
            }
        });
    } catch (error) {
        console.error("Upload error details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;
