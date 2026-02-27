import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { ReactNode } from "react";

type CalloutType = "info" | "warning" | "success" | "error";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const icons = {
  info: Info,
  warning: AlertCircle,
  success: CheckCircle,
  error: XCircle,
};

const styles = {
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  success: "bg-green-500/10 border-green-500/30 text-green-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
};

const darkStyles = {
  info: "dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400",
  warning:
    "dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400",
  success: "dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400",
  error: "dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
};

const iconStyles = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  success: "text-green-500",
  error: "text-red-500",
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const Icon = icons[type];

  return (
    <div
      className={`my-6 p-4 rounded-lg border ${styles[type]} ${darkStyles[type]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[type]}`} />
        <div className="flex-1">
          {title && (
            <p className="font-semibold mb-1 text-foreground">{title}</p>
          )}
          <div className="text-sm leading-relaxed text-[#888] dark:text-[#888]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
