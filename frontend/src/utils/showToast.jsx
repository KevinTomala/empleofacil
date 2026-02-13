import toast from "react-hot-toast";
import Toast from "../components/Toast";

function normalizeToastType(type) {
  if (type === "error") return "danger";
  return type;
}

export function showToast({ type = "info", message = "", actions, duration, onClose } = {}) {
  const normalizedType = normalizeToastType(type);
  const hasRenderer = typeof actions === "function";
  const toastDuration = hasRenderer ? Infinity : duration ?? 3000;

  return toast.custom(
    (t) => (
      <Toast
        type={normalizedType}
        message={message}
        actions={hasRenderer ? actions(() => toast.dismiss(t.id)) : null}
        onClose={() => {
          toast.dismiss(t.id);
          if (onClose) onClose();
        }}
      />
    ),
    {
      duration: toastDuration,
      position: "top-right",
    }
  );
}
