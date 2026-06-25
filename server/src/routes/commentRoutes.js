import express from 'express';
import { updateComment, deleteComment } from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Author-ownership is enforced inside the controller.
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
