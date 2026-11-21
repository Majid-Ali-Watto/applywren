import mongoose from "mongoose";
import { defineModel } from "./defineModel";

import { APPLICATION_STATUSES } from "./applicationStatuses";

export { APPLICATION_STATUSES };

const recipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    fields: { type: Map, of: String }, // personalization values, e.g. company, role
    status: { type: String, enum: ["sent", "failed"], required: true },
    error: String,
  },
  { _id: false }
);

// One application per company + role; a single send may create several.
const applicationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  company: { type: String }, // absent on legacy records
  role: { type: String },
  recipients: [recipientSchema],
  ccEmails: [{ type: String }],
  bccEmails: [{ type: String }],
  subject: { type: String, required: true }, // template, before personalization
  coverLetter: { type: String, required: true }, // template HTML
  resumeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  // Legacy fields from records created before recipients/resumeIds existed.
  mainEmails: [{ type: String }],
  resumes: [{ name: String, base64: String }],
  status: { type: String, enum: APPLICATION_STATUSES, default: "pending" },
  appliedAt: { type: Date, default: Date.now },
});

applicationSchema.index({ userId: 1, appliedAt: -1 });

export default defineModel("Application", applicationSchema);
