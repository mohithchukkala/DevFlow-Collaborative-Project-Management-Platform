import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Sprint from '../models/Sprint.js';
import Milestone from '../models/Milestone.js';
import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import Document from '../models/Document.js';

// Populates the database with demo data. Destroys existing data first.
//   Run with: npm run seed
const run = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Sprint.deleteMany({}),
    Milestone.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
    Document.deleteMany({}),
  ]);

  console.log('Creating users...');
  const [admin, manager, dev1, dev2] = await User.create([
    { name: 'Ada Admin', email: 'admin@devflow.test', password: 'password123', role: 'Admin', title: 'Engineering Lead' },
    { name: 'Max Manager', email: 'manager@devflow.test', password: 'password123', role: 'Manager', title: 'Product Manager' },
    { name: 'Devi Developer', email: 'dev1@devflow.test', password: 'password123', role: 'Developer', title: 'Frontend Engineer' },
    { name: 'Sam Developer', email: 'dev2@devflow.test', password: 'password123', role: 'Developer', title: 'Backend Engineer' },
  ]);

  console.log('Creating project...');
  const project = await Project.create({
    name: 'DevFlow Web App',
    key: 'DEV',
    description: 'Building the collaborative project management platform.',
    owner: manager._id,
    members: [
      { user: admin._id, role: 'Manager' },
      { user: dev1._id, role: 'Developer' },
      { user: dev2._id, role: 'Developer' },
    ],
  });

  const cols = Object.fromEntries(project.columns.map((c) => [c.name, c._id]));

  console.log('Creating sprint & milestone...');
  const sprint = await Sprint.create({
    name: 'Sprint 1 - Foundations',
    goal: 'Auth, boards, and core task flows',
    project: project._id,
    status: 'active',
    startDate: new Date('2026-06-16'),
    endDate: new Date('2026-06-30'),
  });
  const milestone = await Milestone.create({
    title: 'MVP Launch',
    description: 'First usable release for the team.',
    project: project._id,
    dueDate: new Date('2026-07-15'),
  });

  console.log('Creating tasks...');
  const taskSeed = [
    { title: 'Set up JWT authentication', column: 'Done', type: 'task', priority: 'high', assignee: dev2._id, points: 5, done: true },
    { title: 'Design Kanban board UI', column: 'In Progress', type: 'story', priority: 'high', assignee: dev1._id, points: 8 },
    { title: 'Drag-and-drop task ordering', column: 'In Progress', type: 'task', priority: 'medium', assignee: dev1._id, points: 5 },
    { title: 'Real-time notifications with Socket.io', column: 'To Do', type: 'task', priority: 'medium', assignee: dev2._id, points: 5 },
    { title: 'File uploads via Cloudinary', column: 'To Do', type: 'task', priority: 'low', assignee: null, points: 3 },
    { title: 'Login screen flickers on slow networks', column: 'Backlog', type: 'bug', priority: 'urgent', assignee: dev1._id, points: 2 },
    { title: 'Analytics dashboard charts', column: 'Backlog', type: 'story', priority: 'medium', assignee: null, points: 8 },
  ];

  let counter = 0;
  const orderByCol = {};
  const createdTasks = [];
  for (const t of taskSeed) {
    counter += 1;
    const colId = cols[t.column];
    orderByCol[t.column] = (orderByCol[t.column] || 0);
    const task = await Task.create({
      key: `${project.key}-${counter}`,
      title: t.title,
      description: 'Seeded task for demo purposes.',
      project: project._id,
      column: colId,
      order: orderByCol[t.column]++,
      type: t.type,
      priority: t.priority,
      assignee: t.assignee,
      reporter: manager._id,
      sprint: sprint._id,
      milestone: milestone._id,
      storyPoints: t.points,
      completedAt: t.done ? new Date('2026-06-20') : null,
    });
    createdTasks.push(task);
  }
  await Project.findByIdAndUpdate(project._id, { taskCounter: counter });

  console.log('Creating comments, activity & a document...');
  await Comment.create({
    task: createdTasks[1]._id,
    author: manager._id,
    body: 'Lets keep the board layout close to the Jira reference.',
  });
  await Document.create({
    project: project._id,
    title: 'Getting Started',
    content: '# Getting Started\n\nWelcome to the DevFlow project. This document holds shared notes.',
    author: manager._id,
    lastEditedBy: manager._id,
  });
  await Activity.create({
    project: project._id,
    actor: manager._id,
    action: 'project.created',
    message: `created project ${project.name}`,
  });

  console.log('\nSeed complete! Demo logins (password: password123):');
  console.log('  Admin    -> admin@devflow.test');
  console.log('  Manager  -> manager@devflow.test');
  console.log('  Dev      -> dev1@devflow.test / dev2@devflow.test');

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
