"use client";

import { Settings, X, ExternalLink, Check } from "lucide-react";
import { useState, useEffect } from "react";

const DEFAULT_URL = "http://localhost:5000";

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("api-base-url");
    if (stored) {
      setUrl(stored);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("api-base-url", url);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsOpen(false);
      window.location.reload();
    }, 800);
  };

  const handleReset = () => {
    setUrl(DEFAULT_URL);
    localStorage.removeItem("api-base-url");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsOpen(false);
      window.location.reload();
    }, 800);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--border)] transition-colors"
        aria-label="Change API URL"
      >
        <ExternalLink className="w-3.5 h-3.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center pt-[10vh]"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-grotesk font-semibold text-lg text-[var(--foreground)]">
                  API Configuration
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Set your API base URL for all examples
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--muted-foreground)]" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                  Base URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]"></div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Quick presets
                </span>
                <div className="flex-1 h-px bg-[var(--border)]"></div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 text-sm border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--accent)] rounded-lg transition-colors"
                >
                  Default (localhost:5000)
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--muted)] rounded-b-xl">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm bg-[var(--accent)] text-[var(--accent-foreground)] font-medium rounded-lg hover:opacity-90 transition-colors"
              >
                {saved ? <Check className="w-4 h-4" /> : null}
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
