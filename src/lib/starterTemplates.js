// Ready-made letters users can start from. Bodies are Quill-compatible HTML.
// {{name|fallback}} placeholders are optional; {{company}} and {{role}} need a
// value per recipient; {{my_*}} come from the sender's profile; [bracketed]
// text must be replaced before sending.

const p = (...lines) => lines.map((line) => `<p>${line}</p>`).join("");
const gap = "<p><br></p>";
const bullets = (...items) =>
  `<ol>${items.map((item) => `<li data-list="bullet">${item}</li>`).join("")}</ol>`;

export const STARTER_TEMPLATES = [
  {
    id: "classic",
    name: "Classic cover letter",
    description: "A complete, formal letter for a specific role.",
    subject: "Application for {{role}} at {{company}}",
    html: [
      p("Dear {{name|Hiring Manager}},"),
      gap,
      p(
        "I'm writing to apply for the {{role}} position at {{company}}. With [X years] of experience in [your field or key skill], I'm confident I can contribute to your team from day one."
      ),
      gap,
      p(
        "In my current role at [current or most recent company], I [a specific achievement, ideally with a number]. I also [a second relevant responsibility or result], which has prepared me well for this position."
      ),
      gap,
      p(
        "What draws me to {{company}} is [something specific: the product, mission or recent news]. I'd welcome the chance to bring my experience in [key skill] to your team."
      ),
      gap,
      p("My resume is attached. Thank you for your time and consideration; I look forward to hearing from you."),
      gap,
      p("Best regards,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "short",
    name: "Short and direct",
    description: "A brief email for recruiters who skim.",
    subject: "{{role}} application – {{my_name}}",
    html: [
      p("Hi {{name|there}},"),
      gap,
      p(
        "I'd like to be considered for the {{role}} role at {{company}}. I'm a [your title] with [X years] of experience, and my resume is attached. A few highlights:"
      ),
      bullets(
        "[Achievement or skill that matches the role]",
        "[Second achievement or skill]",
        "[A relevant tool, certification or project]"
      ),
      gap,
      p("I'm happy to jump on a call whenever suits you. Thanks for your time!"),
      gap,
      p("Best,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "referral",
    name: "Referral",
    description: "When someone at the company suggested you apply.",
    subject: "Referred by [referrer's name]: {{role}} at {{company}}",
    html: [
      p("Dear {{name|Hiring Manager}},"),
      gap,
      p(
        "[Referrer's full name] on the [team name] team suggested I reach out about the {{role}} opening at {{company}}. After hearing about [what they told you about the team or work], I'm excited to apply."
      ),
      gap,
      p(
        "I have [X years] of experience in [key skill], most recently at [current company], where I [a specific achievement]. I think that experience lines up well with what the team needs right now."
      ),
      gap,
      p("I've attached my resume and would love to talk about how I could help. Thank you for considering my application."),
      gap,
      p("Kind regards,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "career-change",
    name: "Career change",
    description: "Connect experience from another field to the new role.",
    subject: "Application for {{role}}: bringing [previous field] experience to {{company}}",
    html: [
      p("Dear {{name|Hiring Manager}},"),
      gap,
      p(
        "I'm applying for the {{role}} position at {{company}}. After [X years] in [previous field], I've spent the last [time period] building skills in [new field], including [course, certification or project]."
      ),
      gap,
      p(
        "My background gives me a perspective many candidates won't have. In [previous role], I [transferable achievement, e.g. led a team, managed budgets, worked with customers], and I've since applied that in [new-field project], where I [result]."
      ),
      gap,
      p(
        "I'm drawn to {{company}} because [specific reason], and I'm eager to contribute while continuing to grow. My resume is attached; I'd appreciate the chance to discuss how my experience can help your team."
      ),
      gap,
      p("Sincerely,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "graduate",
    name: "Recent graduate",
    description: "For internships and entry-level roles.",
    subject: "{{role}} application – [Your degree] graduate",
    html: [
      p("Dear {{name|Hiring Manager}},"),
      gap,
      p(
        "I recently graduated from [university] with a degree in [subject], and I'm excited to apply for the {{role}} position at {{company}}."
      ),
      gap,
      p("During my studies I built practical experience that fits this role:"),
      bullets(
        "[Internship, job or project] where I [what you did and the result]",
        "[Relevant coursework, thesis or competition]",
        "[Skills or tools you used, e.g. languages, software, methods]"
      ),
      gap,
      p(
        "I'm a fast learner and would love to start my career at {{company}} because [specific reason]. My resume is attached, and I'd be grateful for the opportunity to interview."
      ),
      gap,
      p("Best regards,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "open-application",
    name: "Open application",
    description: "No posted role? Only needs a company name.",
    subject: "Exploring opportunities at {{company}}",
    html: [
      p("Hi {{name|there}},"),
      gap,
      p(
        "I've been following {{company}} for a while, especially [a product, project or announcement], and I'd love to explore whether there's a place for me on your team, even if no matching role is posted right now."
      ),
      gap,
      p(
        "I'm a [your title] with [X years] of experience in [key skills]. Recently I [a specific achievement]. I'm particularly interested in [team or area at the company]."
      ),
      gap,
      p("My resume is attached. If now isn't the right time, I'd still appreciate being kept in mind for future openings."),
      gap,
      p("Thanks for reading,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
  {
    id: "follow-up",
    name: "Follow-up",
    description: "A polite nudge 1–2 weeks after applying.",
    subject: "Following up: {{role}} application",
    html: [
      p("Hi {{name|there}},"),
      gap,
      p(
        "I applied for the {{role}} position at {{company}} on [date] and wanted to follow up. I'm still very interested in the role and in [something specific about the team or company]."
      ),
      gap,
      p(
        "Since applying, I've [a recent update: project, certification or achievement], which I think adds to what I can bring. I've attached my resume again for convenience."
      ),
      gap,
      p("Is there any other information I can provide? Thank you for your time."),
      gap,
      p("Best regards,", "{{my_name}}", "{{my_phone|}}", "{{my_link|}}"),
    ].join(""),
  },
];
