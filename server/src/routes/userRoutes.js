import express from 'express';
import { listUsers, getUser, updateUserRole, deleteUser } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.use(protect);

router.get('/', listUsers);
router.get('/:id', getUser);
router.put('/:id/role', authorize('Admin'), updateUserRole);
router.delete('/:id', authorize('Admin'), deleteUser);

export default router;
