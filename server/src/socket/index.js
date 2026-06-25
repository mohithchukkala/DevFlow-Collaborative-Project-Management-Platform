import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { setIO } from './io.js';

// Initializes Socket.io: authenticates connections via JWT and manages rooms.
//   - Each user joins a personal room `user:<id>` for direct notifications.
//   - Clients join `project:<id>` rooms to receive live board/comment updates.
export const initSocket = (io) => {
  setIO(io);

  // Authenticate every socket using the JWT supplied in the handshake.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email role');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    // Join a project room after verifying membership.
    socket.on('project:join', async (projectId) => {
      try {
        const project = await Project.findById(projectId).select('owner members');
        if (!project) return;
        const isMember =
          String(project.owner) === userId ||
          project.members.some((m) => String(m.user) === userId) ||
          socket.user.role === 'Admin';
        if (isMember) {
          socket.join(`project:${projectId}`);
          socket.emit('project:joined', { projectId });
        }
      } catch {
        /* ignore malformed ids */
      }
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Lightweight "user is typing" relay for task comment threads.
    socket.on('comment:typing', ({ projectId, taskId }) => {
      socket.to(`project:${projectId}`).emit('comment:typing', {
        taskId,
        user: { _id: socket.user._id, name: socket.user.name },
      });
    });

    socket.on('disconnect', () => {
      // Rooms are cleaned up automatically by Socket.io on disconnect.
    });
  });
};
