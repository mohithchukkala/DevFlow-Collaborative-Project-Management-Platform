import asyncHandler from 'express-async-handler';
import Activity from '../models/Activity.js';

// @route GET /api/projects/:projectId/activity?limit=50&taskId=...
export const listActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const filter = { project: req.project._id };
  if (req.query.taskId) filter.task = req.query.taskId;

  const activity = await Activity.find(filter)
    .populate('actor', 'name email avatar')
    .sort('-createdAt')
    .limit(limit);
  res.json({ success: true, activity });
});
