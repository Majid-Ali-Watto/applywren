import nodemailer from "nodemailer";

export const runtime = "nodejs";

/** @param {Request} req */
export async function POST(req) {
  const { recipients, htmlCoverLetter, subject, resumes, cc, bcc } =
    await req.json();

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.FROM,
      pass: process.env.GMAIL_PASS,
    },
  });

  const attachments = (resumes || []).map((file) => ({
    filename: file.name || "file.pdf",
    content: file.base64,
    encoding: "base64",
  }));

  const results = await Promise.allSettled(
    recipients.map((to) =>
      transporter.sendMail({
        from: `Majid Ali <${process.env.FROM}>`,
        to,
        cc: cc && cc.length > 0 ? cc : undefined,
        bcc: bcc && bcc.length > 0 ? bcc : undefined,
        subject,
        html: htmlCoverLetter,
        attachments,
      })
    )
  );

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
