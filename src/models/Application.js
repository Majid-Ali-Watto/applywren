import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  mainEmails: [{ type: String, required: true }],
  ccEmails: [{ type: String }],
  bccEmails: [{ type: String }],
  subject: { type: String, required: true },
  coverLetter: { type: String, required: true },
  resumes: [{
    name: String,
    base64: String // base64
  }],
  status: {
    type: String,
    enum: ['pending', 'interviewing', 'rejected', 'accepted'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);