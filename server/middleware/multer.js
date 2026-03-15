// middleware/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../images");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".png", ".jpg", ".jpeg"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files allowed (png, jpg, jpeg). Got: ${ext}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large — max 2MB" });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}

module.exports = { upload, handleUploadError };