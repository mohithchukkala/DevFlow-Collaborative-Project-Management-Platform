import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    goal: { type: String, default: '' },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Sprint = mongoose.model('Sprint', sprintSchema);
export default Sprint;
