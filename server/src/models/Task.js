import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    filename: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // e.g. DEV-12
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: { type: String, default: '' },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    // Column is referenced by the embedded column subdocument id on the project.
    column: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Position within the column for drag-and-drop ordering.
    order: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['task', 'bug', 'story', 'epic'],
      default: 'task',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', default: null },
    labels: [{ type: String, trim: true }],
    storyPoints: { type: Number, default: null },
    dueDate: { type: Date, default: null },
    attachments: [attachmentSchema],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, column: 1, order: 1 });
taskSchema.index({ title: 'text', description: 'text', key: 'text' });

const Task = mongoose.model('Task', taskSchema);
export default Task;
