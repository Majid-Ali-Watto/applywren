import mongoose from "mongoose";

/**
 * Compiles a model once per process. In development, hot reload re-runs model
 * files after schema edits while Mongoose keeps the first compiled model, which
 * then silently drops new fields (strict mode); so the cached one is replaced.
 */
export function defineModel(name, schema) {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return mongoose.models[name] ?? mongoose.model(name, schema);
}
