const express = require('express');
const route = express.Router();
const multer = require('multer');
const { uploadFile } = require('../controllers/jobcontroller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('application/pdf') ||
            file.mimetype.startsWith('text/plain')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

route.post('/upload', upload.single('file'), uploadFile);

module.exports = route;
