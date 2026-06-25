import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

const sanitize = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  title: user.title,
  createdAt: user.createdAt,
});

// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('A user with that email already exists');
  }

  // First registered user becomes Admin; otherwise honour requested role
  // but never allow self-assigning Admin via public registration.
  const userCount = await User.countDocuments();
  let assignedRole = 'Developer';
  if (userCount === 0) {
    assignedRole = 'Admin';
  } else if (role === 'Manager' || role === 'Developer') {
    assignedRole = role;
  }

  const user = await User.create({ name, email, password, role: assignedRole });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: sanitize(user),
  });
});

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: sanitize(user),
  });
});

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

// @route PUT /api/auth/me
export const updateMe = asyncHandler(async (req, res) => {
  const { name, title, avatar, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (name !== undefined) user.name = name;
  if (title !== undefined) user.title = title;
  if (avatar !== undefined) user.avatar = avatar;
  if (password) user.password = password;

  await user.save();
  res.json({ success: true, user: sanitize(user) });
});
