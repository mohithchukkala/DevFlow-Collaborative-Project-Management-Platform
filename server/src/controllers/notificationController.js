import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

// @route GET /api/notifications
export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('actor', 'name avatar')
    .sort('-createdAt')
    .limit(100);
  const unread = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ success: true, notifications, unread });
});

// @route PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json({ success: true, notification });
});

// @route PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// @route DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
  res.json({ success: true, message: 'Notification deleted' });
});
