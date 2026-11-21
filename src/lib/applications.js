/** Company for a recipient: the imported `company` field, else the email domain. */
export function companyOf(recipient) {
  return recipient.fields?.company?.trim() || recipient.email.split("@")[1].toLowerCase();
}

/**
 * Splits one send into applications, one per company + role (+ letter, when
 * recipients carry a `message` index), so each can be tracked with its own
 * status. `recipients` are `{ email, fields, message?, ... }`; returns
 * `[{ company, role, recipients }]` in first-seen order.
 */
export function groupByCompany(recipients) {
  const groups = new Map();
  for (const recipient of recipients) {
    const company = companyOf(recipient);
    const role = recipient.fields?.role?.trim() || "";
    const key = `${company.toLowerCase()}\u0000${role.toLowerCase()}\u0000${recipient.message ?? 0}`;
    if (!groups.has(key)) groups.set(key, { company, role, recipients: [] });
    groups.get(key).recipients.push(recipient);
  }
  return [...groups.values()];
}
