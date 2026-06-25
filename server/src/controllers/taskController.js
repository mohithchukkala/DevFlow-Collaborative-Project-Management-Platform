import asyncHandler from 'express-async-handler';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { logActivity } from '../services/activityService.js';
import { notify } from '../services/notificationService.js';
import { emitToProject } from '../socket/io.js';

const populateTask = (query) =>
  query
    .populate('assignee', 'name email avatar title')
    .populate('reporter', 'name email avatar title')
    .populate('sprint', 'name status')
    .populate('milestone', 'title status');

const resolveColumn = (project, columnId) =>
  project.columns.find((c) => String(c._id) === String(columnId));

// @route GET /api/projects/:projectId/tasks  (board data; supports filters)
export const listTasks = asyncHandler(async (req, res) => {
  const { sprint, assignee, type, priority, label, milestone, search } = req.query;
  const filter = { project: req.project._id };

  if (sprint) filter.sprint = sprint === 'none' ? null : sprint;
  if (milestone) filter.milestone = milestone;
  if (assignee) filter.assignee = assignee === 'none' ? null : assignee;
  if (type) filter.type = type;
  if (priority) filter.priority = priority;
  if (label) filter.labels = label;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { key: { $regex: search, $options: 'i' } },
    ];
  }

  const tasks = await populateTask(Task.find(filter).sort({ column: 1, order: 1 }));
  res.json({ success: true, count: tasks.length, tasks });
});

// @route GET /api/tasks/:id
export const getTask = asyncHandler(async (req, res) => {
  const task = await populateTask(Task.findById(req.params.id));
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  res.json({ success: true, task });
});

// @route POST /api/projects/:projectId/tasks
export const createTask = asyncHandler(async (req, res) => {
  const project = req.project;
  const { title, description, type, priority, assignee, sprint, milestone, labels, storyPoints, dueDate, column } = req.body;

  if (!title) {
    res.status(400);
    throw new Error('Task title is required');
  }

  // Default to the first column if none specified.
  const targetColumn = column
    ? resolveColumn(project, column)
    : [...project.columns].sort((a, b) => a.order - b.order)[0];
  if (!targetColumn) {
    res.status(400);
    throw new Error('Invalid column for this project');
  }

  // Generate human-friendly key like DEV-12 using an atomic counter.
  const updated = await Project.findByIdAndUpdate(
    project._id,
    { $inc: { taskCounter: 1 } },
    { new: true }
  );
  const key = `${project.key}-${updated.taskCounter}`;

  // Place new task at the top of the column.
  await Task.updateMany(
    { project: project._id, column: targetColumn._id },
    { $inc: { order: 1 } }
  );

  const task = await Task.create({
    key,
    title,
    description,
    project: project._id,
    column: targetColumn._id,
    order: 0,
    type,
    priority,
    assignee: assignee || null,
    reporter: req.user._id,
    sprint: sprint || null,
    milestone: milestone || null,
    labels: labels || [],
    storyPoints: storyPoints ?? null,
    dueDate: dueDate || null,
  });

  const populated = await populateTask(Task.findById(task._id));

  await logActivity({
    project: project._id,
    task: task._id,
    actor: req.user._id,
    action: 'task.created',
    message: `created ${key}: ${title}`,
  });
  emitToProject(project._id, 'task:created', populated);

  if (assignee) {
    await notify({
      recipient: assignee,
      actor: req.user._id,
      type: 'task_assigned',
      message: `${req.user.name} assigned you ${key}: ${title}`,
      project: project._id,
      task: task._id,
    });
  }

  res.status(201).json({ success: true, task: populated });
});

// @route PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const previousAssignee = task.assignee ? String(task.assignee) : null;
  const editable = [
    'title', 'description', 'type', 'priority', 'assignee',
    'sprint', 'milestone', 'labels', 'storyPoints', 'dueDate',
  ];
  for (const field of editable) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field] === '' ? null : req.body[field];
    }
  }

  await task.save();
  const populated = await populateTask(Task.findById(task._id));

  await logActivity({
    project: task.project,
    task: task._id,
    actor: req.user._id,
    action: 'task.updated',
    message: `updated ${task.key}`,
  });
  emitToProject(task.project, 'task:updated', populated);

  // Notify on (re)assignment.
  const newAssignee = task.assignee ? String(task.assignee) : null;
  if (newAssignee && newAssignee !== previousAssignee) {
    await notify({
      recipient: newAssignee,
      actor: req.user._id,
      type: 'task_assigned',
      message: `${req.user.name} assigned you ${task.key}: ${task.title}`,
      project: task.project,
      task: task._id,
    });
  }

  res.json({ success: true, task: populated });
});

// @route PATCH /api/tasks/:id/move  - drag & drop within/between columns
// body: { column, order }  -> column is the destination column id; order is the
// destination index. Reorders sibling tasks accordingly.
export const moveTask = asyncHandler(async (req, res) => {
  const { column, order } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const project = await Project.findById(task.project);
  const destColumn = resolveColumn(project, column);
  if (!destColumn) {
    res.status(400);
    throw new Error('Invalid destination column');
  }

  const fromColumn = String(task.column);
  const toColumn = String(destColumn._id);
  const destOrder = Number.isInteger(order) ? order : 0;

  if (fromColumn === toColumn) {
    // Reorder within the same column.
    await Task.updateMany(
      { project: project._id, column: destColumn._id, _id: { $ne: task._id }, order: { $gte: destOrder } },
      { $inc: { order: 1 } }
    );
  } else {
    // Close the gap in the source column.
    await Task.updateMany(
      { project: project._id, column: task.column, order: { $gt: task.order } },
      { $inc: { order: -1 } }
    );
    // Open a slot in the destination column.
    await Task.updateMany(
      { project: project._id, column: destColumn._id, order: { $gte: destOrder } },
      { $inc: { order: 1 } }
    );
  }

  task.column = destColumn._id;
  task.order = destOrder;

  // Mark completion based on the "Done" column convention.
  const isDoneColumn = /done|complete|closed/i.test(destColumn.name);
  if (isDoneColumn && !task.completedAt) task.completedAt = new Date();
  if (!isDoneColumn && task.completedAt) task.completedAt = null;

  await task.save();
  const populated = await populateTask(Task.findById(task._id));

  await logActivity({
    project: project._id,
    task: task._id,
    actor: req.user._id,
    action: 'task.moved',
    message: `moved ${task.key} to ${destColumn.name}`,
  });
  emitToProject(project._id, 'task:moved', populated);

  res.json({ success: true, task: populated });
});

// @route DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const projectId = task.project;
  const key = task.key;

  // Close the gap left in its column.
  await Task.updateMany(
    { project: projectId, column: task.column, order: { $gt: task.order } },
    { $inc: { order: -1 } }
  );
  await task.deleteOne();

  await logActivity({
    project: projectId,
    actor: req.user._id,
    action: 'task.deleted',
    message: `deleted ${key}`,
  });
  emitToProject(projectId, 'task:deleted', { _id: req.params.id, project: projectId });

  res.json({ success: true, message: 'Task deleted' });
});

// @route POST /api/tasks/:id/attachments  (multipart) - add uploaded files
export const addAttachments = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No files uploaded');
  }

  const attachments = req.files.map((f) => ({
    url: f.path,
    publicId: f.filename,
    filename: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    uploadedBy: req.user._id,
  }));
  task.attachments.push(...attachments);
  await task.save();

  const populated = await populateTask(Task.findById(task._id));
  await logActivity({
    project: task.project,
    task: task._id,
    actor: req.user._id,
    action: 'attachment.added',
    message: `attached ${attachments.length} file(s) to ${task.key}`,
  });
  emitToProject(task.project, 'task:updated', populated);

  res.status(201).json({ success: true, task: populated });
});

// @route DELETE /api/tasks/:id/attachments/:attachmentId
export const removeAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  task.attachments = task.attachments.filter(
    (a) => String(a._id) !== String(req.params.attachmentId)
  );
  await task.save();
  const populated = await populateTask(Task.findById(task._id));
  emitToProject(task.project, 'task:updated', populated);
  res.json({ success: true, task: populated });
});
