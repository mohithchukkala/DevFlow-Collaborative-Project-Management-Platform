import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Buffer files in memory, then stream them to Cloudinary in our own middleware.
// (We avoid multer-storage-cloudinary because it pins the legacy cloudinary v1.)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const uploadBuffer = (buffer, originalname) =>
  new Promise((resolve, reject) => {
    const name = originalname.split('.').slice(0, -1).join('.') || originalname;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'devflow',
        resource_type: 'auto',
        public_id: `${Date.now()}-${name}`,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Normalizes uploaded file(s) to look like a storage-engine result so controllers
// can read `file.path` (the secure URL) and `file.filename` (the public id).
const normalize = async (file) => {
  const result = await uploadBuffer(file.buffer, file.originalname);
  file.path = result.secure_url;
  file.filename = result.public_id;
  return file;
};

// Express middleware: run AFTER multer to push buffered files to Cloudinary.
export const sendToCloudinary = async (req, res, next) => {
  try {
    if (req.file) await normalize(req.file);
    if (Array.isArray(req.files)) await Promise.all(req.files.map(normalize));
    next();
  } catch (err) {
    next(err);
  }
};

export { cloudinary };
