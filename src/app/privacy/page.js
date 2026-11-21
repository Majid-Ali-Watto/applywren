import Link from "next/link";
import LegalPage, { Contact } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description: `What ${SITE_NAME} collects, why, how it's protected, and how to delete it.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${SITE_NAME} helps you send personalized job applications from your own email account and keep track of them. This policy explains what we collect to do that, why, and the choices you have. We don't sell your data, show ads, or track you around the web.`}
    >
      <h2>What we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your email address and, if you add them, your name, phone number and a LinkedIn or portfolio link.</li>
        <li>
          Your password, stored only as a one-way bcrypt hash. One-time codes for verification and password resets are
          also stored only as hashes and expire after 30 minutes.
        </li>
        <li>Security counters, such as recent failed sign-in attempts, used to lock out password guessing.</li>
      </ul>
      <h3>Your email connection</h3>
      <ul>
        <li>
          If you connect your email, we store your mail server&apos;s name and port and the <strong>app password</strong> you
          create for {SITE_NAME}. The app password is encrypted (AES-256-GCM) before it&apos;s saved and is never shown
          back to anyone, including you. We use it only to send the emails you ask us to send.
        </li>
      </ul>
      <h3>What you add</h3>
      <ul>
        <li>Resumes and other PDF files, cover letters and templates.</li>
        <li>
          The recipient lists you import or type, such as recruiters&apos; email addresses, names, companies, roles and any
          other columns, plus the CC and BCC addresses you choose.
        </li>
        <li>
          Your application history: who you emailed, when, the subject and letter as sent, the attachments, whether
          delivery succeeded, and the status you set.
        </li>
      </ul>
      <p>
        Spreadsheets are read in your browser. Only the rows you go on to use are sent to our servers.
      </p>
      <h3>Technical data</h3>
      <ul>
        <li>
          Your IP address is used to limit repeated sign-in, sign-up and code attempts. We keep it only as part of a
          counter that is deleted automatically within 24 hours.
        </li>
        <li>
          Our hosting provider may keep standard server logs (such as IP address, time and requested page) for a short
          time to run and secure the service.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide {SITE_NAME}: storing your documents, filling in your letters, and sending each email you ask us to send, from your own email account.</li>
        <li>To keep accounts secure: verifying your email address, stopping password guessing and preventing abuse.</li>
        <li>To email you about your account, such as verification and password-reset codes. We don&apos;t send marketing.</li>
      </ul>
      <p>
        We don&apos;t sell or rent your data, use it for advertising, or use your documents or letters to train AI models.
      </p>
      <p>
        Where privacy laws such as the GDPR apply, we rely on <strong>contract</strong> (to provide the service you signed up
        for) and on <strong>legitimate interests</strong> (to keep the service secure and prevent abuse).
      </p>

      <h2>People you email</h2>
      <p>
        When you add recruiters or other people as recipients, you decide whose details to add and what to send them. For
        that data you are responsible for having a lawful reason to contact them, and we process it only on your
        instructions to send your emails and keep your history. If someone asks you to stop contacting them, please
        respect it and remove them.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Your email provider</strong>: your applications are sent through your own email account, so your provider
          (for example Google or Yahoo) handles them under its own privacy policy.
        </li>
        <li>
          <strong>Service providers</strong> who run the service for us: our hosting provider, our database provider, and
          the email service that delivers our verification codes. They may only use the data to provide their service to us.
        </li>
        <li><strong>Authorities</strong>, when the law requires it.</li>
      </ul>
      <p>Your documents and history are private to your account. Other users can&apos;t see them.</p>

      <h2>Cookies and browser storage</h2>
      <p>
        We use one strictly necessary cookie to keep you signed in. It can&apos;t be read by scripts on the page and expires
        after 24 hours or when you sign out. We don&apos;t use analytics, advertising or tracking cookies, so there&apos;s
        nothing to opt out of.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account data, documents and history: until you delete them or your account.</li>
        <li>Verification and reset codes: 30 minutes. Rate-limit counters: at most 24 hours.</li>
        <li>
          When you delete your account, your profile, email connection, documents and application history are removed
          from our database straight away. Copies in our hosting provider&apos;s backups, if any, are removed on their
          normal schedule.
        </li>
      </ul>

      <h2>How we protect it</h2>
      <ul>
        <li>All traffic is encrypted with HTTPS.</li>
        <li>Passwords and codes are hashed, and email app passwords are encrypted.</li>
        <li>Sessions use a secure, HttpOnly cookie, and repeated sign-in or code attempts are limited and locked out.</li>
        <li>Every request is checked so you can only reach your own data.</li>
      </ul>
      <p>No system is perfectly secure, but we work to protect your data and will tell you if a breach affects it.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>See and correct</strong> your details any time in your profile.</li>
        <li><strong>Disconnect your email</strong> in your profile. You can also revoke the app password at your provider.</li>
        <li>
          <strong>Delete your account</strong> and everything in it from your profile (Account → Delete account).
        </li>
        <li>
          <strong>Get a copy</strong> of your data, object to how we use it, or ask anything else by emailing <Contact />.
        </li>
      </ul>
      <p>
        Depending on where you live, you may have further rights, such as complaining to your local data protection
        authority. We&apos;ll answer requests within 30 days.
      </p>

      <h2>Children</h2>
      <p>{SITE_NAME} isn&apos;t for anyone under 16, and we don&apos;t knowingly collect their data.</p>

      <h2>Where data is stored</h2>
      <p>
        Your data is stored with our hosting and database providers, which may be in a different country from yours.
        Where required, transfers are protected by safeguards such as standard contractual clauses.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date above, and for important changes we&apos;ll tell you by email or in
        the app before they apply. See also our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>Contact</h2>
      <p>Questions or requests about your privacy: <Contact />.</p>
    </LegalPage>
  );
}
