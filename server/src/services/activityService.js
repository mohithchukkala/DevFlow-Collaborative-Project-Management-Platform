import Activity from '../models/Activity.js';
import { emitToProject } from '../socket/io.js';

// Records an activity entry and broadcasts it to the project room in real time.
export const logActivity = async ({ project, task = null, actor, action, message, meta = {} }) => {
  const activity = await Activity.create({ project, task, actor, action, message, meta });
  const populated = await activity.populate('actor', 'name email avatar');
  emitToProject(project, 'activity:new', populated);
  return populated;
};
