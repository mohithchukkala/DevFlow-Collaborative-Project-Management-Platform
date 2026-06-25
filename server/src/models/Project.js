import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Project-level role, independent of the global account role.
    role: {
      type: String,
      enum: ['Manager', 'Developer'],
      default: 'Developer',
    },
  },
  { _id: false }
);

// Customizable Kanban columns per project.
const columnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 8,
    },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    columns: {
      type: [columnSchema],
      default: () => [
        { name: 'Backlog', order: 0 },
        { name: 'To Do', order: 1 },
        { name: 'In Progress', order: 2 },
        { name: 'In Review', order: 3 },
        { name: 'Done', order: 4 },
      ],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    taskCounter: { type: Number, default: 0 }, // for generating keys like DEV-1
  },
  { timestamps: true }
);

projectSchema.index({ key: 1 }, { unique: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
