import asyncHandler from 'express-async-handler';
import Document from '../models/Document.js';
import { logActivity } from '../services/activityService.js';

// @route GET /api/projects/:projectId/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ project: req.project._id })
    .populate('author', 'name avatar')
    .populate('lastEditedBy', 'name avatar')
    .sort('-updatedAt');
  res.json({ success: true, documents });
});

// @route POST /api/projects/:projectId/documents
export const createDocument = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  if (!title) {
    res.status(400);
    throw new Error('Document title is required');
  }
  const doc = await Document.create({
    project: req.project._id,
    title,
    content: content || '',
    author: req.user._id,
    lastEditedBy: req.user._id,
  });
  await logActivity({
    project: req.project._id,
    actor: req.user._id,
    action: 'document.created',
    message: `created document "${title}"`,
  });
  res.status(201).json({ success: true, document: doc });
});

// @route PUT /api/documents/:id
export const updateDocument = asyncHandler(async (req, res) => {
  const doc = req.resource; // loaded by loadParentProject(Document)
  if (req.body.title !== undefined) doc.title = req.body.title;
  if (req.body.content !== undefined) doc.content = req.body.content;
  doc.lastEditedBy = req.user._id;
  await doc.save();
  res.json({ success: true, document: doc });
});

// @route DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  await req.resource.deleteOne();
  res.json({ success: true, message: 'Document deleted' });
});
