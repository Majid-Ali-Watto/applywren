import mongoose from "mongoose";
import { defineModel } from "./defineModel";

// One counter per key (e.g. "login:ip:1.2.3.4") and time window. MongoDB
// deletes each document once its window has passed.
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default defineModel("RateLimit", rateLimitSchema);
