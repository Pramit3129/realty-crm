import Link from "next/link";
import { ArrowRight, Search, Terminal } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] pt-16">
      <div className="text-center max-w-2xl mx-auto px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--muted)] border border-[var(--border)] rounded-full text-sm text-[var(--muted-foreground)] mb-8">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          API v1.0
        </div>

        <h1 className="text-5xl font-grotesk font-bold text-[var(--foreground)] mb-6 tracking-tight">
          Realty CRM API
        </h1>
        <p className="text-xl text-[var(--muted-foreground)] mb-10 leading-relaxed">
          A powerful real estate CRM API with authentication, workspace
          management, and team collaboration features.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <Link
            href="/docs/getting-started/introduction"
            className="group flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] font-medium rounded-lg hover:opacity-90 transition-all"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="https://github.com/Realty-Genie/realty-crm"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-[var(--border)] text-[var(--muted-foreground)] font-medium rounded-lg hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          >
            GitHub
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-[var(--muted)] border border-[var(--border)] rounded-xl">
            <div className="w-10 h-10 bg-[var(--border)] rounded-lg flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <h3 className="text-[var(--foreground)] font-semibold mb-2">
              Simple API
            </h3>
            <p className="text-[var(--muted-foreground)] text-sm">
              RESTful endpoints with intuitive design and comprehensive
              documentation.
            </p>
          </div>
          <div className="p-6 bg-[var(--muted)] border border-[var(--border)] rounded-xl">
            <div className="w-10 h-10 bg-[var(--border)] rounded-lg flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <h3 className="text-[var(--foreground)] font-semibold mb-2">
              JWT Auth
            </h3>
            <p className="text-[var(--muted-foreground)] text-sm">
              Secure authentication with access and refresh tokens.
            </p>
          </div>
          <div className="p-6 bg-[var(--muted)] border border-[var(--border)] rounded-xl">
            <div className="w-10 h-10 bg-[var(--border)] rounded-lg flex items-center justify-center mb-4">
              <ArrowRight className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <h3 className="text-[var(--foreground)] font-semibold mb-2">
              Team Workspaces
            </h3>
            <p className="text-[var(--muted-foreground)] text-sm">
              Collaborate with your team using workspaces and memberships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
