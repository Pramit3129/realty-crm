import { CodeBlock } from "@/components/code-block";
import { Callout } from "@/components/callout";
import { EndpointBadge } from "@/components/endpoint-badge";

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-");
}

export const components = {
  CodeBlock,
  Callout,
  EndpointBadge,
  h1: (props: any) => {
    const text = props.children?.toString() || "";
    const id = generateId(text);
    return (
      <h1
        id={id}
        className="text-4xl font-grotesk font-bold text-[var(--foreground)] mt-8 mb-4"
        {...props}
      />
    );
  },
  h2: (props: any) => {
    const text = props.children?.toString() || "";
    const id = generateId(text);
    return (
      <h2
        id={id}
        className="text-2xl font-grotesk font-semibold text-[var(--foreground)] mt-10 mb-4 pb-3 border-b border-[var(--border)]"
        {...props}
      />
    );
  },
  h3: (props: any) => {
    const text = props.children?.toString() || "";
    const id = generateId(text);
    return (
      <h3
        id={id}
        className="text-lg font-grotesk font-semibold text-[var(--foreground)] mt-8 mb-3"
        {...props}
      />
    );
  },
  p: (props: any) => (
    <p className="leading-7 mb-4 text-[var(--muted-foreground)]" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
  ),
  li: (props: any) => (
    <li className="text-[var(--muted-foreground)] leading-relaxed" {...props} />
  ),
  a: (props: any) => (
    <a
      className="text-[var(--foreground)] underline underline-offset-4 hover:opacity-70"
      {...props}
    />
  ),
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-[var(--border)]">
      <table className="w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-[var(--muted)]" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  th: ({ children, ...props }: any) => (
    <th
      className="border-t border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td
      className="border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)]"
      {...props}
    >
      {children}
    </td>
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-3 border-[var(--muted-foreground)] pl-4 italic my-4 text-[var(--muted-foreground)]"
      {...props}
    />
  ),
  hr: (props: any) => (
    <hr className="my-10 border-[var(--border)]" {...props} />
  ),
  code: (props: any) => (
    <code
      className="bg-[var(--code-bg)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--code-text)]"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="bg-[var(--code-bg)] p-4 rounded-lg overflow-x-auto my-4 border border-[var(--border)]"
      {...props}
    />
  ),
  strong: (props: any) => (
    <strong className="font-semibold text-[var(--foreground)]" {...props} />
  ),
  em: (props: any) => (
    <em className="italic text-[var(--muted-foreground)]" {...props} />
  ),
};
