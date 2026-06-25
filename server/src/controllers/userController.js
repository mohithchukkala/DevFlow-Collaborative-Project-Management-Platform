import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// @route GET /api/users  (search/list for assignment, member pickers, etc.)
export const listUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const users = await User.find(filter).select('name email role avatar title').sort('name');
  res.json({ success: true, count: users.length, users });
});

// @route GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name email role avatar title createdAt');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user });
});

// @route PUT /api/users/:id/role  (Admin only) - change a user's global role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['Admin', 'Manager', 'Developer'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.role = role;
  await user.save();
  res.json({ success: true, user: { _id: user._id, name: user.name, role: user.role } });
});

// @route DELETE /api/users/:id  (Admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot delete your own account here');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User removed' });
});
