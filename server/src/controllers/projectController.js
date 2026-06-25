import asyncHandler from 'express-async-handler';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Sprint from '../models/Sprint.js';
import Milestone from '../models/Milestone.js';
import User from '../models/User.js';
import { logActivity } from '../services/activityService.js';
import { notify } from '../services/notificationService.js';

const populateProject = (query) =>
  query
    .populate('owner', 'name email avatar title')
    .populate('members.user', 'name email avatar title role');

// @route POST /api/projects   (Admin/Manager)
export const createProject = asyncHandler(async (req, res) => {
  const { name, key, description, members } = req.body;
  if (!name || !key) {
    res.status(400);
    throw new Error('Project name and key are required');
  }

  const exists = await Project.findOne({ key: key.toUpperCase() });
  if (exists) {
    res.status(400);
    throw new Error('A project with that key already exists');
  }

  const memberDocs = (members || [])
    .filter((m) => String(m.user) !== String(req.user._id))
    .map((m) => ({ user: m.user, role: m.role === 'Manager' ? 'Manager' : 'Developer' }));

  const project = await Project.create({
    name,
    key: key.toUpperCase(),
    description,
    owner: req.user._id,
    members: memberDocs,
  });

  await logActivity({
    project: project._id,
    actor: req.user._id,
    action: 'project.created',
    message: `created project ${project.name}`,
  });

  // Notify added members.
  for (const m of memberDocs) {
    await notify({
      recipient: m.user,
      actor: req.user._id,
      type: 'added_to_project',
      message: `${req.user.name} added you to project ${project.name}`,
      project: project._id,
    });
  }

  const populated = await populateProject(Project.findById(project._id));
  res.status(201).json({ success: true, project: populated });
});

// @route GET /api/projects   (projects the user owns or is a member of; Admin sees all)
export const listProjects = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'Admin'
    ? {}
    : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };

  if (req.query.status) filter.status = req.query.status;

  const projects = await populateProject(Project.find(filter).sort('-updatedAt'));

  // Attach lightweight task counts for dashboard cards.
  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const total = await Task.countDocuments({ project: p._id });
      const done = await Task.countDocuments({ project: p._id, completedAt: { $ne: null } });
      return { ...p.toObject(), taskCount: total, completedCount: done };
    })
  );

  res.json({ success: true, count: withCounts.length, projects: withCounts });
});

// @route GET /api/projects/:projectId
export const getProject = asyncHandler(async (req, res) => {
  const project = await populateProject(Project.findById(req.project._id));
  res.json({ success: true, project, projectRole: req.projectRole });
});

// @route PUT /api/projects/:projectId   (Manager/owner)
export const updateProject = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const project = req.project;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (status !== undefined) project.status = status;
  await project.save();

  await logActivity({
    project: project._id,
    actor: req.user._id,
    action: 'project.updated',
    message: `updated project settings`,
  });

  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// @route DELETE /api/projects/:projectId   (owner/Admin)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = req.project;
  if (req.user.role !== 'Admin' && String(project.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the project owner can delete this project');
  }
  await Promise.all([
    Task.deleteMany({ project: project._id }),
    Sprint.deleteMany({ project: project._id }),
    Milestone.deleteMany({ project: project._id }),
  ]);
  await project.deleteOne();
  res.json({ success: true, message: 'Project and related data deleted' });
});

// @route POST /api/projects/:projectId/members   (Manager/owner)
export const addMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  const project = req.project;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (String(project.owner) === String(userId)) {
    res.status(400);
    throw new Error('Owner is already part of the project');
  }
  if (project.members.some((m) => String(m.user) === String(userId))) {
    res.status(400);
    throw new Error('User is already a member');
  }

  project.members.push({ user: userId, role: role === 'Manager' ? 'Manager' : 'Developer' });
  await project.save();

  await logActivity({
    project: project._id,
    actor: req.user._id,
    action: 'member.added',
    message: `added ${user.name} to the project`,
  });
  await notify({
    recipient: userId,
    actor: req.user._id,
    type: 'added_to_project',
    message: `${req.user.name} added you to project ${project.name}`,
    project: project._id,
  });

  const populated = await populateProject(Project.findById(project._id));
  res.status(201).json({ success: true, project: populated });
});

// @route PUT /api/projects/:projectId/members/:userId   (Manager/owner) - change role
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const project = req.project;
  const member = project.members.find((m) => String(m.user) === String(req.params.userId));
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }
  member.role = role === 'Manager' ? 'Manager' : 'Developer';
  await project.save();
  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// @route DELETE /api/projects/:projectId/members/:userId   (Manager/owner)
export const removeMember = asyncHandler(async (req, res) => {
  const project = req.project;
  project.members = project.members.filter((m) => String(m.user) !== String(req.params.userId));
  await project.save();

  await logActivity({
    project: project._id,
    actor: req.user._id,
    action: 'member.removed',
    message: `removed a member from the project`,
  });

  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// @route PUT /api/projects/:projectId/columns   (Manager/owner) - replace board columns
export const updateColumns = asyncHandler(async (req, res) => {
  const { columns } = req.body;
  if (!Array.isArray(columns) || columns.length === 0) {
    res.status(400);
    throw new Error('At least one column is required');
  }
  const project = req.project;

  // Preserve existing ids where provided so tasks keep their column reference.
  project.columns = columns.map((c, idx) => ({
    ...(c._id ? { _id: c._id } : {}),
    name: c.name,
    order: idx,
  }));
  await project.save();

  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});
