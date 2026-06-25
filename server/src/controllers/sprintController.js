import asyncHandler from 'express-async-handler';
import Sprint from '../models/Sprint.js';
import Task from '../models/Task.js';
import { logActivity } from '../services/activityService.js';
import { notifyMany } from '../services/notificationService.js';
import Project from '../models/Project.js';

// @route GET /api/projects/:projectId/sprints
export const listSprints = asyncHandler(async (req, res) => {
  const sprints = await Sprint.find({ project: req.project._id }).sort('-createdAt');
  // Attach task/point totals per sprint for planning views.
  const withStats = await Promise.all(
    sprints.map(async (s) => {
      const tasks = await Task.find({ sprint: s._id }).select('storyPoints completedAt');
      const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const donePoints = tasks
        .filter((t) => t.completedAt)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      return {
        ...s.toObject(),
        taskCount: tasks.length,
        completedCount: tasks.filter((t) => t.completedAt).length,
        totalPoints,
        donePoints,
      };
    })
  );
  res.json({ success: true, sprints: withStats });
});

// @route POST /api/projects/:projectId/sprints   (Manager/owner)
export const createSprint = asyncHandler(async (req, res) => {
  const { name, goal, startDate, endDate } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Sprint name is required');
  }
  const sprint = await Sprint.create({
    name,
    goal,
    startDate: startDate || null,
    endDate: endDate || null,
    project: req.project._id,
  });
  await logActivity({
    project: req.project._id,
    actor: req.user._id,
    action: 'sprint.created',
    message: `created sprint ${name}`,
  });
  res.status(201).json({ success: true, sprint });
});

// @route PUT /api/sprints/:id   (Manager/owner)
export const updateSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) {
    res.status(404);
    throw new Error('Sprint not found');
  }
  const wasActive = sprint.status === 'active';
  ['name', 'goal', 'status', 'startDate', 'endDate'].forEach((f) => {
    if (req.body[f] !== undefined) sprint[f] = req.body[f];
  });
  await sprint.save();

  // When a sprint is started, notify all assignees with tasks in it.
  if (!wasActive && sprint.status === 'active') {
    const tasks = await Task.find({ sprint: sprint._id, assignee: { $ne: null } }).select('assignee');
    const project = await Project.findById(sprint.project);
    await logActivity({
      project: sprint.project,
      actor: req.user._id,
      action: 'sprint.started',
      message: `started sprint ${sprint.name}`,
    });
    await notifyMany(tasks.map((t) => t.assignee), {
      actor: req.user._id,
      type: 'sprint_started',
      message: `Sprint "${sprint.name}" has started in ${project?.name || 'a project'}`,
      project: sprint.project,
    });
  }

  res.json({ success: true, sprint });
});

// @route DELETE /api/sprints/:id   (Manager/owner)
export const deleteSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) {
    res.status(404);
    throw new Error('Sprint not found');
  }
  // Detach tasks from the sprint rather than deleting them.
  await Task.updateMany({ sprint: sprint._id }, { sprint: null });
  await sprint.deleteOne();
  res.json({ success: true, message: 'Sprint deleted' });
});
