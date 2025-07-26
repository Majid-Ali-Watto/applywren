const defaultState = [
  { option: "Pending", value: "pending" },
  { option: "interviewing", value: "Interviewing" },
  { option: "rejected", value: "Rejected" },
  { option: "accepted", value: "Accepted" },
];
export default function StatusDropdown({
  value,
  onChange,
  options = defaultState,
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="border rounded px-2 py-1 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.option}
        </option>
      ))}
    </select>
  );
}
