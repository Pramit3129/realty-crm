"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsButton } from "@/components/settings-button";
import { ApiUrlDisplay } from "@/components/api-url-display";
import { Search, ChevronRight, Terminal, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navigation = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs/getting-started/introduction" },
      { title: "Quick Start", href: "/docs/getting-started/quick-start" },
      { title: "Authentication", href: "/docs/getting-started/authentication" },
      {
        title: "Environment Variables",
        href: "/docs/getting-started/environment-variables",
      },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Register", href: "/docs/api-reference/auth/register" },
      { title: "Login", href: "/docs/api-reference/auth/login" },
      { title: "Refresh Token", href: "/docs/api-reference/auth/refresh" },
      { title: "Logout", href: "/docs/api-reference/auth/logout" },
      { title: "Google OAuth", href: "/docs/api-reference/auth/google-oauth" },
      { title: "Get Current User", href: "/docs/api-reference/users/me" },
      {
        title: "Admin: Get All Users",
        href: "/docs/api-reference/users/admin-users",
      },
      {
        title: "Create Workspace",
        href: "/docs/api-reference/workspace/create",
      },
      {
        title: "Add Members",
        href: "/docs/api-reference/memberships/add-members",
      },
      {
        title: "Get Workspace Members",
        href: "/docs/api-reference/memberships/workspace-members",
      },
      {
        title: "Update Membership",
        href: "/docs/api-reference/memberships/update",
      },
      {
        title: "Remove Member",
        href: "/docs/api-reference/memberships/remove",
      },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "JWT Authentication", href: "/docs/concepts/jwt-auth" },
      { title: "Role-Based Access Control", href: "/docs/concepts/rbac" },
      {
        title: "Workspace & Memberships",
        href: "/docs/concepts/workspace-memberships",
      },
    ],
  },
];

const searchIndex = [
  {
    title: "Introduction",
    href: "/docs/getting-started/introduction",
    content:
      "Realty CRM is a powerful backend API for real estate customer relationship management. Features authentication, workspace management, team collaboration.",
  },
  {
    title: "Quick Start",
    href: "/docs/getting-started/quick-start",
    content:
      "Get up and running with Realty CRM in minutes. Prerequisites Node.js Bun MongoDB.",
  },
  {
    title: "Authentication",
    href: "/docs/getting-started/authentication",
    content:
      "Understanding the authentication system. JWT JSON Web Tokens. Email Password. Google OAuth.",
  },
  {
    title: "Environment Variables",
    href: "/docs/getting-started/environment-variables",
    content:
      "Complete list of environment variables. MONGO_URI JWT_ACCESS_SECRET JWT_REFRESH_SECRET.",
  },
  {
    title: "Register",
    href: "/docs/api-reference/auth/register",
    content:
      "Register a new user account. Email password authentication. Request body name email password.",
  },
  {
    title: "Login",
    href: "/docs/api-reference/auth/login",
    content:
      "Authenticate with email and password. Returns access and refresh tokens.",
  },
  {
    title: "Refresh Token",
    href: "/docs/api-reference/auth/refresh",
    content:
      "Get a new access token using refresh token. Token refresh happens automatically.",
  },
  {
    title: "Logout",
    href: "/docs/api-reference/auth/logout",
    content: "Log out and invalidate tokens. Clears refresh token cookie.",
  },
  {
    title: "Google OAuth",
    href: "/docs/api-reference/auth/google-oauth",
    content: "Authenticate using Google accounts. OAuth 2.0 flow with Google.",
  },
  {
    title: "Get Current User",
    href: "/docs/api-reference/users/me",
    content:
      "Get the authenticated users profile. Requires Bearer token authentication.",
  },
  {
    title: "Admin: Get All Users",
    href: "/docs/api-reference/users/admin-users",
    content: "List all users admin only. Restricted to administrators.",
  },
  {
    title: "Create Workspace",
    href: "/docs/api-reference/workspace/create",
    content: "Create a new workspace. The creating user becomes the owner.",
  },
  {
    title: "Add Members",
    href: "/docs/api-reference/memberships/add-members",
    content: "Add users to a workspace. Creates membership records.",
  },
  {
    title: "Get Workspace Members",
    href: "/docs/api-reference/memberships/workspace-members",
    content:
      "List all members of a workspace. Returns array of membership objects.",
  },
  {
    title: "Update Membership",
    href: "/docs/api-reference/memberships/update",
    content: "Update a members role or acceptance status. PATCH request.",
  },
  {
    title: "Remove Member",
    href: "/docs/api-reference/memberships/remove",
    content: "Remove a member from a workspace. Soft delete operation.",
  },
  {
    title: "JWT Authentication",
    href: "/docs/concepts/jwt-auth",
    content:
      "Deep dive into JWT token system. Access token refresh token. Token types lifetime algorithm.",
  },
  {
    title: "Role-Based Access Control",
    href: "/docs/concepts/rbac",
    content:
      "Understanding roles and permissions. User roles admin. Permission matrix.",
  },
  {
    title: "Workspace & Memberships",
    href: "/docs/concepts/workspace-memberships",
    content:
      "Managing workspaces and team collaboration. SOLO TEAM workspace types.",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof searchIndex>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSelectedIndex(0);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
      setSearchQuery("");
    }
  }, [searchOpen]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = searchIndex
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query),
      )
      .slice(0, 8);
    setSearchResults(results);
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1,
      );
    } else if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      router.push(searchResults[selectedIndex].href);
      setSearchOpen(false);
    }
  };

  const handleResultClick = (href: string) => {
    router.push(href);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-[var(--border)] bg-[var(--sidebar-bg)]/95 backdrop-blur-sm z-50">
        <div className="flex items-center justify-between h-full px-4 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/docs/getting-started/introduction"
              className="font-grotesk font-bold text-lg text-[var(--foreground)]"
            >
              Realty CRM
            </Link>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-3 w-80 px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm text-[var(--muted-foreground)] hover:border-[var(--accent)] transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Search documentation...</span>
              <span className="text-xs bg-[var(--border)] px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg">
              <Terminal className="w-4 h-4 text-[var(--muted-foreground)]" />
              <span className="text-sm text-[var(--muted-foreground)] font-mono hidden sm:inline">
                <ApiUrlDisplay />
              </span>
              <SettingsButton />
            </div>

            <a
              href="https://github.com/Realty-Genie/realty-crm"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search className="w-5 h-5 text-[var(--muted-foreground)]" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none text-base"
              />
              <button onClick={() => setSearchOpen(false)}>
                <X className="w-5 h-5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-2">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleResultClick(result.href)}
                    className={`block px-4 py-3 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? "bg-[var(--muted)]"
                        : "hover:bg-[var(--muted)]"
                    }`}
                  >
                    <div className="text-[var(--foreground)] font-medium mb-1">
                      {result.title}
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)] line-clamp-1">
                      {result.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No results found for "{searchQuery}"
              </div>
            )}

            <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] flex items-center gap-4">
              <span>
                <kbd className="bg-[var(--border)] px-1.5 py-0.5 rounded">
                  ↑↓
                </kbd>{" "}
                Navigate
              </span>
              <span>
                <kbd className="bg-[var(--border)] px-1.5 py-0.5 rounded">
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span>
                <kbd className="bg-[var(--border)] px-1.5 py-0.5 rounded">
                  esc
                </kbd>{" "}
                Close
              </span>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-[var(--border)] bg-[var(--sidebar-bg)] overflow-y-auto">
        <nav className="p-4 space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="font-medium text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                          isActive
                            ? "bg-[var(--muted)] text-[var(--foreground)] font-medium"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                        }`}
                      >
                        <ChevronRight
                          className={`w-3 h-3 ${isActive ? "opacity-100" : "opacity-0"}`}
                        />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
