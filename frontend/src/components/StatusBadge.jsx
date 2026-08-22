import { STATUS, STATUS_CLASS } from "../utils/constants.js";

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      <span className="dot" />
      {STATUS[status]}
    </span>
  );
}
