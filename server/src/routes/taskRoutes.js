import express from 'express';
import {
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  addAttachments,
  removeAttachment,
} from '../controllers/taskController.js';
import { listComments, addComment } from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';
import { loadTaskProject } from '../middleware/projectAccess.js';
import { upload, sendToCloudinary } from '../config/cloudinary.js';

const router = express.Router();
router.use(protect);

router.get('/:id', loadTaskProject, getTask);
router.put('/:id', loadTaskProject, updateTask);
router.patch('/:id/move', loadTaskProject, moveTask);
router.delete('/:id', loadTaskProject, deleteTask);

// Attachments (Cloudinary)
router.post('/:id/attachments', loadTaskProject, upload.array('files', 10), sendToCloudinary, addAttachments);
router.delete('/:id/attachments/:attachmentId', loadTaskProject, removeAttachment);

// Comments nested under a task
router.get('/:taskId/comments', loadTaskProject, listComments);
router.post('/:taskId/comments', loadTaskProject, addComment);

export default router;
