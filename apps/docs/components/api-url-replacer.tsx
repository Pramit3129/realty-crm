"use client";

import { useEffect, useState, useRef } from "react";
import { useBaseUrl } from "@/components/base-url";

const DEFAULT_URL = "http://localhost:5000";

export function ApiUrlWrapper({ children }: { children: React.ReactNode }) {
  const { baseUrl } = useBaseUrl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  if (baseUrl === DEFAULT_URL) {
    return <>{children}</>;
  }

  return (
    <span data-api-url={baseUrl} className="api-url-wrapper">
      {children}
    </span>
  );
}

export function useReplaceApiUrl() {
  const { baseUrl } = useBaseUrl();

  const replaceUrl = (code: string) => {
    if (baseUrl === DEFAULT_URL) return code;
    return code.replace(DEFAULT_URL, baseUrl);
  };

  return { replaceUrl, baseUrl };
}
