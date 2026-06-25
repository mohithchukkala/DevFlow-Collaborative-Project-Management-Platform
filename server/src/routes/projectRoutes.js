import express from 'express';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
  updateColumns,
} from '../controllers/projectController.js';
import { listTasks, createTask } from '../controllers/taskController.js';
import { listSprints, createSprint } from '../controllers/sprintController.js';
import { listMilestones, createMilestone } from '../controllers/milestoneController.js';
import { listActivity } from '../controllers/activityController.js';
import { listDocuments, createDocument } from '../controllers/documentController.js';
import { projectAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { loadProject, requireProjectManager } from '../middleware/projectAccess.js';

const router = express.Router();
router.use(protect);

// Collection
// Any authenticated user can create a project; the creator becomes its owner
// (which grants full manager rights within that project regardless of global role).
router.post('/', createProject);
router.get('/', listProjects);

// Single project (all guarded by loadProject for access control)
router.get('/:projectId', loadProject, getProject);
router.put('/:projectId', loadProject, requireProjectManager, updateProject);
router.delete('/:projectId', loadProject, deleteProject);

// Members
router.post('/:projectId/members', loadProject, requireProjectManager, addMember);
router.put('/:projectId/members/:userId', loadProject, requireProjectManager, updateMemberRole);
router.delete('/:projectId/members/:userId', loadProject, requireProjectManager, removeMember);

// Board columns
router.put('/:projectId/columns', loadProject, requireProjectManager, updateColumns);

// Tasks (board)
router.get('/:projectId/tasks', loadProject, listTasks);
router.post('/:projectId/tasks', loadProject, createTask);

// Sprints
router.get('/:projectId/sprints', loadProject, listSprints);
router.post('/:projectId/sprints', loadProject, requireProjectManager, createSprint);

// Milestones
router.get('/:projectId/milestones', loadProject, listMilestones);
router.post('/:projectId/milestones', loadProject, requireProjectManager, createMilestone);

// Documents
router.get('/:projectId/documents', loadProject, listDocuments);
router.post('/:projectId/documents', loadProject, createDocument);

// Activity & analytics
router.get('/:projectId/activity', loadProject, listActivity);
router.get('/:projectId/analytics', loadProject, projectAnalytics);

export default router;
