import "../styles/notifications.css";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ICONS = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  danger: XCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const TITLES = {
  success: "Operacion exitosa",
  warning: "Atencion",
  danger: "Ocurrio un error",
  error: "Ocurrio un error",
  info: "Informacion",
};

export default function Toast({
  type = "info",
  message = "",
  onClose,
  inline = false,
  actions = null,
}) {
  const Icon = ICONS[type] || ICONS.info;
  const title = TITLES[type] || TITLES.info;
  const className = `toast-card ${type} ${inline ? "inline" : ""}`;

  return (
    <div className={className} role="alert">
      <div className="toast-icon">
        <Icon width={20} height={20} aria-hidden="true" />
      </div>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <p className="toast-message mb-0">{message}</p>
      </div>
      {actions && <div className="toast-actions">{actions}</div>}
      {onClose && (
        <button type="button" className="toast-close" onClick={onClose}>
          <XMarkIcon width={18} height={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
