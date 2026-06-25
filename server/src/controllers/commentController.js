import asyncHandler from 'express-async-handler';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { logActivity } from '../services/activityService.js';
import { notify, notifyMany } from '../services/notificationService.js';
import { emitToProject } from '../socket/io.js';

// Parse @mentions of the form @[email] or @name and resolve to user ids.
const resolveMentions = async (body) => {
  const handles = [...body.matchAll(/@([\w.+-]+@[\w.-]+\.\w+|\w[\w\s.]*?)(?=\s|$|[,.!?])/g)].map(
    (m) => m[1].trim()
  );
  if (handles.length === 0) return [];
  const users = await User.find({
    $or: [
      { email: { $in: handles.map((h) => h.toLowerCase()) } },
      { name: { $in: handles } },
    ],
  }).select('_id');
  return users.map((u) => u._id);
};

// @route GET /api/tasks/:taskId/comments
export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ task: req.params.taskId })
    .populate('author', 'name email avatar title')
    .populate('mentions', 'name email')
    .sort('createdAt');
  res.json({ success: true, comments });
});

// @route POST /api/tasks/:taskId/comments
export const addComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) {
    res.status(400);
    throw new Error('Comment body is required');
  }
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const mentions = await resolveMentions(body);
  const comment = await Comment.create({
    task: task._id,
    author: req.user._id,
    body: body.trim(),
    mentions,
  });
  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email avatar title')
    .populate('mentions', 'name email');

  emitToProject(task.project, 'comment:added', { taskId: String(task._id), comment: populated });
  await logActivity({
    project: task.project,
    task: task._id,
    actor: req.user._id,
    action: 'comment.added',
    message: `commented on ${task.key}`,
  });

  // Notify task assignee + reporter (excluding the commenter) and any mentions.
  const stakeholders = [task.assignee, task.reporter].filter(Boolean);
  await notifyMany(stakeholders, {
    actor: req.user._id,
    type: 'comment_added',
    message: `${req.user.name} commented on ${task.key}`,
    project: task.project,
    task: task._id,
  });
  for (const m of mentions) {
    await notify({
      recipient: m,
      actor: req.user._id,
      type: 'mention',
      message: `${req.user.name} mentioned you on ${task.key}`,
      project: task.project,
      task: task._id,
    });
  }

  res.status(201).json({ success: true, comment: populated });
});

// @route PUT /api/comments/:id
export const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('You can only edit your own comments');
  }
  comment.body = req.body.body?.trim() || comment.body;
  comment.mentions = await resolveMentions(comment.body);
  comment.edited = true;
  await comment.save();
  const populated = await Comment.findById(comment._id).populate('author', 'name email avatar title');
  const task = await Task.findById(comment.task).select('project');
  emitToProject(task.project, 'comment:updated', { taskId: String(comment.task), comment: populated });
  res.json({ success: true, comment: populated });
});

// @route DELETE /api/comments/:id
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }
  if (String(comment.author) !== String(req.user._id) && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('You can only delete your own comments');
  }
  const task = await Task.findById(comment.task).select('project');
  await comment.deleteOne();
  emitToProject(task.project, 'comment:deleted', {
    taskId: String(comment.task),
    commentId: req.params.id,
  });
  res.json({ success: true, message: 'Comment deleted' });
});
