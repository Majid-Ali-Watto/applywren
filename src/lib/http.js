import { after } from "next/server";
import { HttpError, ValidationError } from "./validate";

/**
 * Runs `task` after the response is sent, so slow work (like sending an email
 * only when an account exists) can't be timed to learn anything. Outside a
 * Next.js request (tests), it runs before returning instead.
 */
export async function afterResponse(task, context) {
  const run = () => task().catch((error) => console.error(`${context} failed:`, error));
  try {
    after(run);
  } catch {
    await run();
  }
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Reads a JSON body of at most `maxBytes`, stopping as soon as it's exceeded
 * (route handlers have no size limit of their own). Malformed JSON is a 400,
 * a body that's too large a 413.
 */
export async function readJson(req, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  const tooLarge = () => new HttpError(413, "That request is too large.");
  if (Number(req.headers.get("content-length")) > maxBytes) throw tooLarge();
  const chunks = [];
  let size = 0;
  const reader = req.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

/** Converts a thrown error into a response without leaking internals. */
export function errorResponse(error, context) {
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(`${context} error:`, error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
