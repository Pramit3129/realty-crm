"use client";

import { useEffect, useState } from "react";

const DEFAULT_URL = "http://localhost:5000";

export function ApiUrlDisplay() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);

  useEffect(() => {
    const stored = localStorage.getItem("api-base-url");
    if (stored) {
      setBaseUrl(stored);
    }

    const handleStorage = () => {
      const url = localStorage.getItem("api-base-url");
      setBaseUrl(url || DEFAULT_URL);
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(() => {
      const url = localStorage.getItem("api-base-url");
      setBaseUrl(url || DEFAULT_URL);
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return <>{baseUrl}</>;
}
