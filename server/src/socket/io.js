// Holds the Socket.io server instance so it can be used from controllers/services
// without threading it through every function call.
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

// Emit an event to everyone in a project room.
export const emitToProject = (projectId, event, payload) => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, payload);
};

// Emit an event to a specific user's personal room.
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};
