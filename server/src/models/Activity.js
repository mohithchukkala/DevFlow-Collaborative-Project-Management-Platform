import mongoose from 'mongoose';

// Audit / activity history entries scoped to a project (and optionally a task).
const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // e.g. 'task.created', 'task.moved', 'comment.added', 'member.added'
    action: { type: String, required: true },
    // Human-readable summary, e.g. "moved DEV-3 to In Progress"
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ project: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
