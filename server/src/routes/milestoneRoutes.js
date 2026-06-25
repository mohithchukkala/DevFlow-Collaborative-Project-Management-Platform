import express from 'express';
import { updateMilestone, deleteMilestone } from '../controllers/milestoneController.js';
import { protect } from '../middleware/auth.js';
import { loadParentProject, requireProjectManager } from '../middleware/projectAccess.js';
import Milestone from '../models/Milestone.js';

const router = express.Router();
router.use(protect);

router.put('/:id', loadParentProject(Milestone), requireProjectManager, updateMilestone);
router.delete('/:id', loadParentProject(Milestone), requireProjectManager, deleteMilestone);

export default router;
