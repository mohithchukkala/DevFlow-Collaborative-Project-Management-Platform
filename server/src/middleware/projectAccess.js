import asyncHandler from 'express-async-handler';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

// Loads the project referenced by :projectId (or req.body.project) and verifies
// the requesting user has access. Attaches `req.project` and `req.projectRole`.
//
// Access rules:
//   - Admin (global role) can access any project.
//   - Project owner and members can access the project.
// projectRole resolves to: 'owner' | 'Manager' | 'Developer'
export const loadProject = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id || req.body.project;
  if (!projectId) {
    res.status(400);
    throw new Error('Project id is required');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const userId = String(req.user._id);
  const isOwner = String(project.owner) === userId;
  const membership = project.members.find((m) => String(m.user) === userId);
  const isAdmin = req.user.role === 'Admin';

  if (!isOwner && !membership && !isAdmin) {
    res.status(403);
    throw new Error('You do not have access to this project');
  }

  req.project = project;
  req.projectRole = isOwner ? 'owner' : isAdmin && !membership ? 'Manager' : membership?.role || 'Developer';
  next();
});

// Loads the project that owns the task/comment-bearing resource and verifies
// access. Works for routes that reference a task id at :id or :taskId.
export const loadTaskProject = asyncHandler(async (req, res, next) => {
  const taskId = req.params.id || req.params.taskId;
  const task = await Task.findById(taskId);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const project = await Project.findById(task.project);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const userId = String(req.user._id);
  const isOwner = String(project.owner) === userId;
  const membership = project.members.find((m) => String(m.user) === userId);
  const isAdmin = req.user.role === 'Admin';

  if (!isOwner && !membership && !isAdmin) {
    res.status(403);
    throw new Error('You do not have access to this resource');
  }

  req.task = task;
  req.project = project;
  req.projectRole = isOwner ? 'owner' : isAdmin && !membership ? 'Manager' : membership?.role || 'Developer';
  next();
});

// Factory: loads a resource by :id whose document has a `project` field, then
// resolves and authorizes that project. Used for sprints/milestones.
export const loadParentProject = (Model, attachAs = 'resource') =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      res.status(404);
      throw new Error(`${Model.modelName} not found`);
    }
    const project = await Project.findById(doc.project);
    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    const userId = String(req.user._id);
    const isOwner = String(project.owner) === userId;
    const membership = project.members.find((m) => String(m.user) === userId);
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !membership && !isAdmin) {
      res.status(403);
      throw new Error('You do not have access to this resource');
    }

    req[attachAs] = doc;
    req.project = project;
    req.projectRole = isOwner ? 'owner' : isAdmin && !membership ? 'Manager' : membership?.role || 'Developer';
    next();
  });

// Requires the resolved project role to be owner/Manager (or global Admin).
export const requireProjectManager = (req, res, next) => {
  if (req.user.role === 'Admin' || req.projectRole === 'owner' || req.projectRole === 'Manager') {
    return next();
  }
  res.status(403);
  return next(new Error('Only project managers can perform this action'));
};
