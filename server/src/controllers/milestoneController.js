import asyncHandler from 'express-async-handler';
import Milestone from '../models/Milestone.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { logActivity } from '../services/activityService.js';
import { notifyMany } from '../services/notificationService.js';

// @route GET /api/projects/:projectId/milestones
export const listMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ project: req.project._id }).sort('dueDate');
  const withStats = await Promise.all(
    milestones.map(async (m) => {
      const total = await Task.countDocuments({ milestone: m._id });
      const done = await Task.countDocuments({ milestone: m._id, completedAt: { $ne: null } });
      return { ...m.toObject(), taskCount: total, completedCount: done };
    })
  );
  res.json({ success: true, milestones: withStats });
});

// @route POST /api/projects/:projectId/milestones   (Manager/owner)
export const createMilestone = asyncHandler(async (req, res) => {
  const { title, description, dueDate } = req.body;
  if (!title) {
    res.status(400);
    throw new Error('Milestone title is required');
  }
  const milestone = await Milestone.create({
    title,
    description,
    dueDate: dueDate || null,
    project: req.project._id,
  });
  await logActivity({
    project: req.project._id,
    actor: req.user._id,
    action: 'milestone.created',
    message: `created milestone ${title}`,
  });
  res.status(201).json({ success: true, milestone });
});

// @route PUT /api/milestones/:id   (Manager/owner)
export const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }
  const wasCompleted = milestone.status === 'completed';
  ['title', 'description', 'status', 'dueDate'].forEach((f) => {
    if (req.body[f] !== undefined) milestone[f] = req.body[f];
  });
  if (milestone.status === 'completed' && !milestone.completedAt) {
    milestone.completedAt = new Date();
  }
  if (milestone.status === 'open') milestone.completedAt = null;
  await milestone.save();

  if (!wasCompleted && milestone.status === 'completed') {
    const project = await Project.findById(milestone.project).populate('members.user', '_id');
    const recipients = [project.owner, ...project.members.map((m) => m.user._id)];
    await logActivity({
      project: milestone.project,
      actor: req.user._id,
      action: 'milestone.completed',
      message: `completed milestone ${milestone.title}`,
    });
    await notifyMany(recipients, {
      actor: req.user._id,
      type: 'milestone_completed',
      message: `Milestone "${milestone.title}" was completed`,
      project: milestone.project,
    });
  }

  res.json({ success: true, milestone });
});

// @route DELETE /api/milestones/:id   (Manager/owner)
export const deleteMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) {
    res.status(404);
    throw new Error('Milestone not found');
  }
  await Task.updateMany({ milestone: milestone._id }, { milestone: null });
  await milestone.deleteOne();
  res.json({ success: true, message: 'Milestone deleted' });
});
