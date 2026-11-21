import mongoose from "mongoose";
import { defineModel } from "./defineModel";

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ["file", "coverLetter"], required: true },
  name: { type: String, required: true },
  content: { type: String, required: true }, // Base64 for PDFs, HTML for cover letters
  hash: { type: String }, // sha256 of file bytes; dedupes stored files per user
  // Hidden from the document manager but kept because applications reference it.
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

documentSchema.index({ userId: 1, type: 1, hash: 1 });

export default defineModel("Document", documentSchema);
