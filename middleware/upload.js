const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'static', 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, name);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
