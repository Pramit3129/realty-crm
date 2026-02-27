interface EndpointBadgeProps {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth?: boolean;
}

const methodColors = {
  GET: "bg-blue-600 text-white",
  POST: "bg-green-500 text-black",
  PUT: "bg-yellow-500 text-black",
  PATCH: "bg-pink-600 text-white",
  DELETE: "bg-red-600 text-white",
};

export function EndpointBadge({ method, path, auth }: EndpointBadgeProps) {
  return (
    <div className="flex items-center gap-2 my-4">
      <span
        className={`px-2.5 py-1 text-xs font-bold rounded ${methodColors[method]}`}
      >
        {method}
      </span>
      <code className="text-sm font-mono text-[var(--muted-foreground)]">
        {path}
      </code>
      {auth !== undefined && (
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            auth
              ? "bg-green-500/20 text-green-500"
              : "bg-[var(--border)] text-[var(--muted-foreground)]"
          }`}
        >
          {auth ? "Auth" : "No Auth"}
        </span>
      )}
    </div>
  );
}
