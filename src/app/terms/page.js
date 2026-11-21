import Link from "next/link";
import LegalPage, { Contact } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/site";
import { DAILY_RECIPIENT_LIMIT, MAX_RECIPIENTS_PER_SEND } from "@/lib/limits";

export const metadata = {
  title: "Terms of Service",
  description: `The rules for using ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms are the agreement between you and ${SITE_NAME} ("we", "us") for using the ${SITE_NAME} app and website. By creating an account or using ${SITE_NAME}, you agree to them. If you don't agree, please don't use it.`}
    >
      <h2>1. What {SITE_NAME} does</h2>
      <p>
        {SITE_NAME} lets you write cover letters, attach your resume, and send personalized job applications to recruiters
        from your own email account, then keep track of them. We may improve, change or stop parts of the service over
        time. If we ever introduce paid features, we&apos;ll tell you before you&apos;re charged anything.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 16 years old and give a real email address that you control.</li>
        <li>An account is for one person. Keep your password private; you&apos;re responsible for what happens in your account.</li>
        <li>Tell us straight away at <Contact /> if you think someone else has accessed it.</li>
      </ul>

      <h2>3. Sending from your email</h2>
      <ul>
        <li>
          When you connect your email with an app password, you let {SITE_NAME} send emails from your account, but only the
          ones you review and send in the app.
        </li>
        <li>
          Your email provider&apos;s own terms and sending limits still apply, and you&apos;re responsible for following them.
          You can disconnect at any time in your profile or by revoking the app password at your provider.
        </li>
        <li>
          Emails are sent as you, under your name. You&apos;re responsible for what they say and who they go to.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>{SITE_NAME} is for genuine job applications. You agree not to:</p>
      <ul>
        <li>send spam, marketing, or bulk email unrelated to applying for a job;</li>
        <li>email people you have no good reason to contact, or keep emailing someone who asked you to stop;</li>
        <li>send anything false, misleading, harassing, hateful, illegal, or that infringes someone else&apos;s rights;</li>
        <li>send malware, or use addresses you scraped or bought;</li>
        <li>
          break anti-spam or privacy laws, such as CAN-SPAM, CASL or the GDPR;
        </li>
        <li>
          get around our sending limits (currently {MAX_RECIPIENTS_PER_SEND} recipients per send and{" "}
          {DAILY_RECIPIENT_LIMIT} per day), probe or attack the service, or access other people&apos;s accounts or data.
        </li>
      </ul>
      <p>We may suspend or close accounts that break these rules, and report illegal activity to the authorities.</p>

      <h2>5. Your content</h2>
      <ul>
        <li>
          You own your resumes, letters and other content. You give us permission to store, process and send it only as
          needed to run {SITE_NAME} for you.
        </li>
        <li>
          You confirm that you have the right to use what you upload, and a lawful reason to use the contact details of
          the people you email. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle data.
        </li>
      </ul>

      <h2>6. No guarantees about results</h2>
      <p>
        We can&apos;t promise that any email is delivered, read or answered, or that you&apos;ll get an interview or a job.
        Delivery depends on your email provider and the recipient&apos;s mail system. Check your letters and recipients
        before you send.
      </p>

      <h2>7. Ending your use</h2>
      <p>
        You can stop using {SITE_NAME} and delete your account at any time from your profile, which deletes your data as
        described in the Privacy Policy. We may suspend or end your access if you break these terms or if we have to for
        legal or security reasons. Where reasonable, we&apos;ll tell you first.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        {SITE_NAME} is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we make no
        warranties of any kind, including that the service will be uninterrupted, error-free or fit for a particular
        purpose.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, such as lost opportunities,
        lost data or lost profits, arising from your use of {SITE_NAME}. Nothing in these terms limits liability that
        can&apos;t be limited by law, or your rights as a consumer.
      </p>

      <h2>10. Responsibility for your use</h2>
      <p>
        If someone makes a claim against us because of emails you sent or content you uploaded in breach of these terms,
        you agree to cover the reasonable costs of that claim, to the extent the law allows.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms. We&apos;ll change the date above, and for important changes we&apos;ll tell you by email or
        in the app before they apply. If you keep using {SITE_NAME} after that, the new terms apply.
      </p>

      <h2>12. Contact</h2>
      <p>Questions about these terms: <Contact />.</p>
    </LegalPage>
  );
}
