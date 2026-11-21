import { ChevronDown } from "lucide-react";
import { APPLICATION_STATUSES } from "@/models/applicationStatuses";
import { STATUS_STYLES, cx } from "./ui";

/** Status picker styled as a colored pill. */
export default function StatusDropdown({ value, onChange, disabled }) {
  const style = STATUS_STYLES[value] ?? STATUS_STYLES.pending;
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        aria-label="Application status"
        className={cx(
          "cursor-pointer appearance-none rounded-full py-1 pl-6 pr-7 text-xs font-medium ring-1 ring-inset",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60",
          style.pill
        )}
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_STYLES[status].label}
          </option>
        ))}
      </select>
      <span className={cx("pointer-events-none absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full", style.dot)} />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
    </span>
  );
}
