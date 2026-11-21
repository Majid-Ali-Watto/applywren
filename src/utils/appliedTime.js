const DAY = 24 * 60 * 60 * 1000;

export function timeAgo(date) {
  const then = new Date(date);
  const days = Math.floor((Date.now() - then.getTime()) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(then);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
