import asyncHandler from 'express-async-handler';

// @route POST /api/uploads  (multipart, field: "file")
// Generic single-file upload (avatars, inline doc images, etc.). Returns the
// Cloudinary URL so the client can store it on whatever resource it wants.
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }
  res.status(201).json({
    success: true,
    file: {
      url: req.file.path,
      publicId: req.file.filename,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  });
});
