export const getDaysAgo = (date) => {
  const days = Math.floor(
    (new Date() - new Date(date)) / (1000 * 60 * 60 * 24)
  );
  return days === 0 ? "Today" : `${days} days ago`;
};
