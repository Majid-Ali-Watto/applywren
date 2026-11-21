import { test } from "vitest";
import assert from "node:assert/strict";
import { autoFields, companyFromEmail, likelyResume, nameFromEmail, senderFields } from "@/lib/autofill";

test("nameFromEmail reads first.last style addresses", () => {
  assert.equal(nameFromEmail("jane.doe@stripe.com"), "Jane Doe");
  assert.equal(nameFromEmail("MARY-ann_smith+jobs@x.io"), "Mary Ann Smith");
});

test("nameFromEmail skips generic inboxes and ambiguous names", () => {
  for (const email of ["hr@acme.com", "talent.team@acme.com", "jdoe@acme.com", "j.doe@acme.com", "john2.doe@acme.com"]) {
    assert.equal(nameFromEmail(email), null, email);
  }
});

test("companyFromEmail uses the registrable domain and skips webmail", () => {
  assert.equal(companyFromEmail("hr@stripe.com"), "Stripe");
  assert.equal(companyFromEmail("jobs@careers.big-co.co.uk"), "Big Co");
  assert.equal(companyFromEmail("someone@gmail.com"), null);
  assert.equal(companyFromEmail("someone@outlook.co.uk"), null);
});

test("autoFields only includes guesses it could make", () => {
  assert.deepEqual(autoFields("jane.doe@stripe.com"), { name: "Jane Doe", company: "Stripe" });
  assert.deepEqual(autoFields("hr@gmail.com"), {});
});

test("senderFields prefers the profile, then guesses from the email", () => {
  assert.deepEqual(senderFields({ email: "majid.ali@example.com", name: "", phone: " 123 " }), {
    my_name: "Majid Ali",
    my_email: "majid.ali@example.com",
    my_phone: "123",
    my_link: "",
  });
  assert.equal(senderFields({ email: "x@y.com", name: "Sam Lee" }).my_name, "Sam Lee");
});

test("likelyResume picks a resume-named file, or the only file, never a guess", () => {
  const file = (name) => ({ name });
  assert.equal(likelyResume([file("portfolio.pdf"), file("Jane_Doe_CV.pdf")]).name, "Jane_Doe_CV.pdf");
  assert.equal(likelyResume([file("portfolio.pdf"), file("resume-2026.pdf")]).name, "resume-2026.pdf");
  assert.equal(likelyResume([file("anything.pdf")]).name, "anything.pdf");
  assert.equal(likelyResume([file("portfolio.pdf"), file("certificate.pdf")]), null);
  assert.equal(likelyResume([file("cvs-receipt.pdf"), file("x.pdf")]), null);
  assert.equal(likelyResume([]), null);
});
