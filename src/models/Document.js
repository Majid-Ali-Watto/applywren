import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['file', 'coverLetter'], required: true },
  name: { type: String, required: true },
  content: { type: String, required: true }, // Base64 for PDFs, HTML for cover letters
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Document || mongoose.model('Document', documentSchema);