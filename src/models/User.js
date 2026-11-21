import mongoose from "mongoose";
import { defineModel } from "./defineModel";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: "" }, // display name used as the sender name
  phone: { type: String, default: "" }, // fills {{my_phone}}
  link: { type: String, default: "" }, // LinkedIn or portfolio URL, fills {{my_link}}
  // The user's own mailbox (SMTP with an app password) that applications are sent from.
  mailbox: {
    host: { type: String },
    port: { type: Number },
    passwordEncrypted: { type: String, select: false }, // lib/mailbox.js#encryptSecret
    connectedAt: { type: Date },
  },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verificationCodeHash: { type: String, default: null },
  verificationCodeExpires: { type: Date, default: null },
  verificationCodeSentAt: { type: Date, default: null },
  verificationAttempts: { type: Number, default: 0 },
  sessionVersion: { type: Number, default: 0 }, // in every session token; bump to sign out everywhere
  sendingUntil: { type: Date, default: null }, // set while a send runs; one at a time per account
});

export default defineModel("User", userSchema);
