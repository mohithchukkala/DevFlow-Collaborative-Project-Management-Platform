import express from 'express';
import { updateDocument, deleteDocument } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { loadParentProject } from '../middleware/projectAccess.js';
import Document from '../models/Document.js';

const router = express.Router();
router.use(protect);

router.put('/:id', loadParentProject(Document), updateDocument);
router.delete('/:id', loadParentProject(Document), deleteDocument);

export default router;
