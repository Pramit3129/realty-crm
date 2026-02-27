"use client";

import { useEffect, useState } from "react";

const DEFAULT_BASE_URL = "http://localhost:5000";

export function BaseUrl({ children }: { children?: React.ReactNode }) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);

  useEffect(() => {
    const stored = localStorage.getItem("api-base-url");
    if (stored) {
      setBaseUrl(stored);
    }
  }, []);

  if (!children) {
    return <>{baseUrl}</>;
  }

  return <>{children}</>;
}

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("api-base-url") || DEFAULT_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

export function useBaseUrl() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);

  useEffect(() => {
    const stored = localStorage.getItem("api-base-url");
    if (stored) {
      setBaseUrl(stored);
    }
  }, []);

  return {
    baseUrl,
    setBaseUrl: (url: string) => {
      localStorage.setItem("api-base-url", url);
      setBaseUrl(url);
    },
  };
}
