import { Sidebar } from "@/components/sidebar";
import { TableOfContents } from "@/components/table-of-contents";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar />
      <main className="flex-1 ml-64 mt-16 min-h-[calc(100vh-4rem)]">
        <div className="flex gap-[5%] px-8 py-10 max-w-[1800px] mx-auto justify-between">
          <article className="w-[60%] min-w-0 prose-docs">{children}</article>
          <TableOfContents />
        </div>
      </main>
    </div>
  );
}
