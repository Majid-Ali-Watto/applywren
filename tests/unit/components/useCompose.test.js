// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiFetch } from "@/utils/api";
import { useCompose } from "@/components/compose/useCompose";

vi.mock("@/utils/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/utils/emailUtils", () => ({
  extractEmailsFromFile: async () => [
    { email: "ann@acme.io", fields: { role: "Engineer", cc: "boss@acme.io; ref@acme.io" } },
    { email: "sam@hooli.io", fields: { role: "Designer" } },
  ],
}));

const pdf = (label) => btoa(`%PDF-1.4 ${label}`);
const library = [
  { _id: "pf", type: "file", name: "portfolio.pdf", createdAt: "2026-11-21" }, // newest first
  { _id: "cv", type: "file", name: "Jane_Doe_CV.pdf", createdAt: "2026-11-20" },
];
let sentBody;

beforeEach(() => {
  sentBody = null;
  apiFetch.mockImplementation(async (path, options) => {
    if (path === "/api/documents") return library;
    if (path.startsWith("/api/documents/")) {
      const doc = library.find((d) => d._id === path.split("/").pop());
      return { ...doc, content: pdf(doc.name) };
    }
    if (path === "/api/sendEmails") {
      sentBody = options.body;
      return { results: options.body.recipients.map((r) => ({ email: r.email, status: "sent" })) };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
});

const setup = async (profile = { email: "me@example.com", name: "Me" }) => {
  const toast = vi.fn();
  const hook = renderHook(() => useCompose({ active: true, profile, toast }));
  await waitFor(() => expect(hook.result.current.library.files).toHaveLength(2));
  return { ...hook, toast };
};

describe("useCompose", () => {
  test("asks to connect the user's email before sending, unless mail is caught locally", async () => {
    const connectIssue = (issues) => issues.find((i) => i.fix === "profile");
    const notConnected = { email: "me@example.com", mailbox: { connected: false } };
    let { result } = await setup(notConnected);
    expect(connectIssue(result.current.issues)).toMatchObject({ step: 3, text: expect.stringContaining("me@example.com") });

    ({ result } = await setup({ ...notConnected, testMode: true }));
    expect(connectIssue(result.current.issues)).toBeUndefined();
    ({ result } = await setup({ email: "me@example.com", mailbox: { connected: true, host: "smtp.gmail.com" } }));
    expect(connectIssue(result.current.issues)).toBeUndefined();
  });

  test("pre-attaches the file named like a resume, not simply the newest one", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.currentFiles.map((f) => f.name)).toEqual(["Jane_Doe_CV.pdf"]));
    expect(result.current.autoAttachedName).toBe("Jane_Doe_CV.pdf");
  });

  test("adding addresses skips invalid ones, dedupes, and guesses details", async () => {
    const { result, toast } = await setup();
    act(() => {
      result.current.addEmails("jane.doe@stripe.com, nope, JANE.DOE@stripe.com\nhr@acme.io");
    });
    expect(result.current.emails).toEqual(["jane.doe@stripe.com", "hr@acme.io"]);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("nope"), "error");
    expect(result.current.recipientFields("jane.doe@stripe.com")).toMatchObject({ name: "Jane Doe", company: "Stripe" });
  });

  test("lists what's missing, pointing at the step that fixes it", async () => {
    const { result } = await setup();
    act(() => {
      result.current.addEmails("hr@gmail.com");
      result.current.setSubject("Application for {{role}}");
      result.current.setLetterHtml("<p>I have [X years] at [company]</p>", "I have [X years] at [company]");
    });
    const issues = result.current.issues.map((i) => [i.step, i.text]);
    expect(issues).toEqual([
      [1, expect.stringContaining("missing details")], // no role for hr@gmail.com
      [2, expect.stringContaining("Fill in 2 blanks")],
    ]);
    expect(result.current.ready).toBe(false);
  });

  test("filling blanks replaces them in the letter and subject", async () => {
    const { result } = await setup();
    act(() => {
      result.current.setSubject("[Your title] application");
      result.current.setLetterHtml("<p>I have [X years] of [skill] &amp; more</p>", "");
    });
    act(() => {
      result.current.fillBlanks({ "[X years]": "5 years", "[skill]": "<React>", "[Your title]": "Engineer" });
    });
    expect(result.current.currentLetter.html).toBe("<p>I have 5 years of &lt;React&gt; &amp; more</p>");
    expect(result.current.subject).toBe("Engineer application");
    expect(result.current.blanksInLetter).toEqual([]);
  });

  test("a tailored role gets its own files; everyone else keeps the default", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.currentFiles).toHaveLength(1));
    act(() => {
      result.current.addEmails("ann@acme.io sam@hooli.io");
      result.current.editField("ann@acme.io", "role", "Engineer");
      result.current.editField("sam@hooli.io", "role", "Designer");
      result.current.setSubject("{{role}} application");
      result.current.setLetterHtml("<p>Hello {{company}}</p>", "Hello");
      result.current.setTailoring(true);
    });
    act(() => result.current.selectRole("designer"));
    expect(result.current.previewTarget).toBe("sam@hooli.io"); // preview follows the role
    act(() => result.current.customizeFiles());
    await act(() => result.current.toggleLibraryFile(library[0])); // add portfolio for designers

    expect(result.current.companies.map((c) => [c.company, c.files.map((f) => f.name)])).toEqual([
      ["Acme", ["Jane_Doe_CV.pdf"]],
      ["Hooli", ["Jane_Doe_CV.pdf", "portfolio.pdf"]],
    ]);
    expect(result.current.ready).toBe(true);

    await act(() => result.current.send());
    expect(sentBody.attachments.map((a) => a.name)).toEqual(["Jane_Doe_CV.pdf", "portfolio.pdf"]);
    expect(sentBody.messages.map((m) => m.attachments)).toEqual([[0], [0, 1]]);
    expect(sentBody.recipients.map((r) => [r.email, r.message, r.fields.company])).toEqual([
      ["ann@acme.io", 0, "Acme"],
      ["sam@hooli.io", 1, "Hooli"],
    ]);
    expect(result.current.result).toEqual({ sent: 2, failed: [] });
  });

  test("CC/BCC are per company: imported from sheet columns or set in review", async () => {
    const { result } = await setup();
    await act(() => result.current.importFile(new File(["x"], "list.csv")));

    // CC column -> copies for that email, not a letter field or table column
    expect(result.current.copiesFor("ann@acme.io")).toEqual({ cc: ["boss@acme.io", "ref@acme.io"], bcc: [] });
    expect(result.current.recipientFields("ann@acme.io").cc).toBeUndefined();
    expect(result.current.columns).not.toContain("cc");

    const hooli = result.current.companies.find((c) => c.company === "Hooli");
    act(() => result.current.setCompanyCopies(hooli, { bcc: ["agent@x.io"] }));
    expect(result.current.companies.find((c) => c.company === "Hooli").bcc).toEqual(["agent@x.io"]);
    expect(result.current.copiesFor("ann@acme.io").bcc).toEqual([]); // other companies untouched

    act(() => result.current.setCopyMe(true));
    expect(result.current.preview("sam@hooli.io").bcc).toEqual(["agent@x.io", "me@example.com"]);

    act(() => {
      result.current.setSubject("Hi");
      result.current.setLetterHtml("<p>Hello</p>", "Hello");
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.send());
    expect(sentBody.copyMe).toBe(true);
    expect(sentBody.recipients.map((r) => [r.email, r.cc, r.bcc])).toEqual([
      ["ann@acme.io", ["boss@acme.io", "ref@acme.io"], []],
      ["sam@hooli.io", [], ["agent@x.io"]],
    ]);
  });

  test("an invalid CC is flagged on the review step for that company", async () => {
    const { result } = await setup();
    act(() => result.current.addEmails("hr@acme.io"));
    act(() => result.current.setCompanyCopies(result.current.companies[0], { cc: ["not-an-email"] }));
    expect(result.current.issuesFor(3).map((i) => i.text)).toEqual([expect.stringContaining("Acme")]);
  });
});
