import express from 'express';
import { overview } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Per-project analytics live under /api/projects/:projectId/analytics.
router.get('/overview', overview);

export default router;
