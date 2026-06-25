import express from 'express';
import { updateSprint, deleteSprint } from '../controllers/sprintController.js';
import { protect } from '../middleware/auth.js';
import { loadParentProject, requireProjectManager } from '../middleware/projectAccess.js';
import Sprint from '../models/Sprint.js';

const router = express.Router();
router.use(protect);

router.put('/:id', loadParentProject(Sprint), requireProjectManager, updateSprint);
router.delete('/:id', loadParentProject(Sprint), requireProjectManager, deleteSprint);

export default router;
