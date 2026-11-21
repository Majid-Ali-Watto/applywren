import { test } from "vitest";
import assert from "node:assert/strict";
import { buildSendBody } from "@/lib/sendPayload";

test("each recipient gets its variant's letter; shared files are sent once", () => {
  const cv = { id: "cv", name: "cv.pdf", base64: "AA==" };
  const portfolio = { id: "pf", name: "portfolio.pdf", base64: "BB==" };
  const body = buildSendBody({
    subject: "Hi",
    variants: {
      "": { html: "<p>default</p>", files: [cv] },
      designer: { html: "<p>design</p>", files: [cv, portfolio] },
    },
    recipients: [
      { email: "a@x.com", fields: { role: "Dev" }, variant: "", cc: ["boss@x.com"] },
      { email: "b@y.com", fields: { role: "Designer" }, variant: "designer" },
      { email: "c@z.com", fields: {}, variant: "" },
    ],
    wrapHtml: (h) => `<div>${h}</div>`,
    copyMe: true,
  });

  assert.deepEqual(body.attachments.map((a) => a.name), ["cv.pdf", "portfolio.pdf"]);
  assert.deepEqual(body.messages, [
    { html: "<div><p>default</p></div>", attachments: [0] },
    { html: "<div><p>design</p></div>", attachments: [0, 1] },
  ]);
  assert.deepEqual(body.recipients.map((r) => r.message), [0, 1, 0]);
  // CC/BCC travel with each email; the only global option is a copy to yourself.
  assert.deepEqual(body.recipients.map((r) => [r.cc, r.bcc]), [[["boss@x.com"], []], [[], []], [[], []]]);
  assert.equal(body.copyMe, true);
  assert.equal("cc" in body, false);
});
