"use client";

import { useState, useEffect } from "react";
import { Check, Copy, ChevronDown } from "lucide-react";

type Language = "curl" | "javascript" | "python" | "typescript";

interface CodeBlockProps {
  languages: {
    [key in Language]?: string;
  };
}

const languageLabels: { [key in Language]: string } = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
};

const DEFAULT_URL = "http://localhost:5000";

export function CodeBlock({ languages }: CodeBlockProps) {
  const [activeLang, setActiveLang] = useState<Language>(
    (Object.keys(languages)[0] as Language) || "curl",
  );
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("api-base-url");
    if (stored) {
      setBaseUrl(stored);
    }
  }, []);

  const availableLangs = Object.keys(languages) as Language[];

  const getCode = () => {
    const code = languages[activeLang];
    if (!code) return "";
    if (baseUrl === DEFAULT_URL) return code;
    return code.replace(DEFAULT_URL, baseUrl);
  };

  const handleCopy = async () => {
    const code = getCode();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-8 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--code-bg)] shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 bg-[var(--muted)]">
        <div className="flex items-center gap-1">
          {availableLangs.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeLang === lang
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)]"
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-5 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed text-[var(--code-text)] whitespace-pre">
          {getCode()}
        </pre>
      </div>
    </div>
  );
}
