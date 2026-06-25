import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Sprint from '../models/Sprint.js';

// @route GET /api/projects/:projectId/analytics
// Returns aggregated metrics for the project analytics dashboard.
export const projectAnalytics = asyncHandler(async (req, res) => {
  const projectId = new mongoose.Types.ObjectId(req.project._id);
  const project = req.project;

  const [byColumn, byPriority, byType, byAssignee, totals, recentDone] = await Promise.all([
    Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$column', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { project: projectId } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
        },
      },
    ]),
    Task.aggregate([
      { $match: { project: projectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
          points: { $sum: { $ifNull: ['$storyPoints', 0] } },
          donePoints: {
            $sum: { $cond: [{ $ne: ['$completedAt', null] }, { $ifNull: ['$storyPoints', 0] }, 0] },
          },
        },
      },
    ]),
    // Completed tasks over the last 14 days for a burn-up/trend line.
    Task.aggregate([
      { $match: { project: projectId, completedAt: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);

  // Map column ids to names.
  const columnMap = Object.fromEntries(project.columns.map((c) => [String(c._id), c.name]));
  const tasksByColumn = project.columns
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      column: c.name,
      count: byColumn.find((b) => String(b._id) === String(c._id))?.count || 0,
    }));

  // Resolve assignee names.
  await project.populate('members.user', 'name avatar');
  const ownerDoc = await Project.findById(project._id).populate('owner', 'name avatar');
  const memberMap = {};
  project.members.forEach((m) => {
    if (m.user?._id) memberMap[String(m.user._id)] = { name: m.user.name, avatar: m.user.avatar };
  });
  if (ownerDoc.owner?._id) {
    memberMap[String(ownerDoc.owner._id)] = {
      name: ownerDoc.owner.name,
      avatar: ownerDoc.owner.avatar,
    };
  }

  const productivity = byAssignee.map((a) => ({
    user: a._id ? memberMap[String(a._id)]?.name || 'Unknown' : 'Unassigned',
    total: a.total,
    completed: a.completed,
  }));

  const summary = totals[0] || { total: 0, completed: 0, points: 0, donePoints: 0 };

  res.json({
    success: true,
    analytics: {
      summary: {
        totalTasks: summary.total,
        completedTasks: summary.completed,
        completionRate: summary.total ? Math.round((summary.completed / summary.total) * 100) : 0,
        totalPoints: summary.points,
        completedPoints: summary.donePoints,
      },
      tasksByColumn,
      tasksByPriority: byPriority.map((p) => ({ priority: p._id, count: p.count })),
      tasksByType: byType.map((t) => ({ type: t._id, count: t.count })),
      productivity,
      completionTrend: recentDone.map((d) => ({ date: d._id, count: d.count })),
    },
  });
});

// @route GET /api/analytics/overview  - cross-project summary for the home dashboard
export const overview = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'Admin'
    ? {}
    : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };
  const projects = await Project.find(filter).select('_id name');
  const projectIds = projects.map((p) => p._id);

  const [taskAgg, myOpen, activeSprints] = await Promise.all([
    Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
        },
      },
    ]),
    Task.countDocuments({
      project: { $in: projectIds },
      assignee: req.user._id,
      completedAt: null,
    }),
    Sprint.countDocuments({ project: { $in: projectIds }, status: 'active' }),
  ]);

  const t = taskAgg[0] || { total: 0, completed: 0 };
  res.json({
    success: true,
    overview: {
      projectCount: projects.length,
      totalTasks: t.total,
      completedTasks: t.completed,
      myOpenTasks: myOpen,
      activeSprints,
    },
  });
});
