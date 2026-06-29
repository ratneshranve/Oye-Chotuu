import multer from 'multer';

const storage = multer.memoryStorage();
const MB = 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
]);

const ALLOWED_MIME_TYPES = new Set([
    ...IMAGE_MIME_TYPES,
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
]);

const createFileFilter = (allowedTypes) => (_req, file, cb) => {
    if (allowedTypes.has(file.mimetype)) return cb(null, true);

    const error = new Error('Unsupported file type');
    error.statusCode = 400;
    return cb(error);
};

export const upload = multer({
    storage,
    limits: { fileSize: 25 * MB, files: 20 },
    fileFilter: createFileFilter(ALLOWED_MIME_TYPES)
});

export const imageUpload = multer({
    storage,
    limits: { fileSize: 5 * MB, files: 1 },
    fileFilter: createFileFilter(IMAGE_MIME_TYPES)
});