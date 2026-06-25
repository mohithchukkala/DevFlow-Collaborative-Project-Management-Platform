import mongoose from 'mongoose';

// Lightweight per-project documentation pages (markdown content).
const documentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
