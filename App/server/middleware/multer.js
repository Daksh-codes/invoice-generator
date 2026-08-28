// middleware/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const IMAGE_UPLOAD_DIR = path.join(__dirname, "../images");
const LINE_ITEM_IMAGE_UPLOAD_DIR = path.join(
  __dirname,
  "../uploads/line-item-images",
);

for (const dir of [IMAGE_UPLOAD_DIR, LINE_ITEM_IMAGE_UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStorage(uploadDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${file.fieldname}-${unique}${ext}`);
    },
  });
}

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
  storage: createStorage(IMAGE_UPLOAD_DIR),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const lineItemImageUpload = multer({
  storage: createStorage(LINE_ITEM_IMAGE_UPLOAD_DIR),
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

module.exports = { upload, lineItemImageUpload, handleUploadError };
