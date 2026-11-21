import { afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

// Integration tests run the real route handlers against MongoDB from
// docker-compose.yml, in a separate database that is wiped before each test.
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/bulk-applier-test";
process.env.JWT_SECRET = "it-0f3c9a7e5b1d4c2a8e6f0b3d5a7c9e1f";
process.env.FROM = "noreply@bulk-applier.test";
process.env.MAILBOX_SECRET = "it-mbx-8c1e5a3f7b9d2c4e6a8f0b1d3c5e7a9b";
delete process.env.SMTP_HOST; // users send through their own (mocked) mailbox

const dbName = new URL(process.env.MONGODB_URI).pathname.slice(1);
if (!dbName.endsWith("-test")) {
  throw new Error(`Refusing to run integration tests against "${dbName}": the database name must end in "-test".`);
}

// Capture outgoing mail instead of sending it. Each message records the
// transport options it went through. Addresses starting with "fail" simulate
// a rejected delivery; the app password "wrong-password" a rejected sign-in.
globalThis.sentMail = [];
const authError = () => Object.assign(new Error("Invalid login"), { code: "EAUTH" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: (options) => ({
      verify: async () => {
        if (options.auth?.pass === "wrong-password") throw authError();
        return true;
      },
      sendMail: async (message) => {
        if (options.auth?.pass === "wrong-password") throw authError();
        if (String(message.to).startsWith("fail")) throw new Error("Mailbox unavailable");
        globalThis.sentMail.push({ ...message, transport: options });
        return { messageId: String(globalThis.sentMail.length) };
      },
      close: () => {},
    }),
  },
}));

// No real DNS: hosts ending in ".internal.test" resolve to a private address,
// everything else to a public one. "workspace.test" uses Google's mail servers.
vi.mock("node:dns/promises", () => ({
  default: {
    lookup: async (host) =>
      host.endsWith(".internal.test") ? [{ address: "10.0.0.5", family: 4 }] : [{ address: "142.250.4.109", family: 4 }],
    resolveMx: async (domain) => {
      if (domain === "workspace.test") return [{ exchange: "aspmx.l.google.com", priority: 1 }];
      throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    },
  },
}));

beforeEach(async () => {
  globalThis.sentMail.length = 0;
  const { connectDB } = await import("@/lib/mongodb");
  await connectDB();
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});
