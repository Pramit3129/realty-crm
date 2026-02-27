import { getMDXContent } from "@/lib/mdx";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function DocsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const result = await getMDXContent(resolvedParams.slug);

  if (!result) {
    notFound();
  }

  const { content, frontmatter } = result;

  return (
    <>
      <h1 className="text-4xl font-grotesk font-bold text-white mb-3">
        {frontmatter.title}
      </h1>
      {frontmatter.description && (
        <p className="text-lg text-[#888] mb-10 leading-relaxed">
          {frontmatter.description}
        </p>
      )}
      <div className="prose-docs">{content}</div>
    </>
  );
}

export async function generateStaticParams() {
  const paths = [
    ["getting-started", "introduction"],
    ["getting-started", "quick-start"],
    ["getting-started", "authentication"],
    ["getting-started", "environment-variables"],
    ["api-reference", "auth", "register"],
    ["api-reference", "auth", "login"],
    ["api-reference", "auth", "refresh"],
    ["api-reference", "auth", "logout"],
    ["api-reference", "auth", "google-oauth"],
    ["api-reference", "users", "me"],
    ["api-reference", "users", "admin-users"],
    ["api-reference", "workspace", "create"],
    ["api-reference", "memberships", "add-members"],
    ["api-reference", "memberships", "workspace-members"],
    ["api-reference", "memberships", "update"],
    ["api-reference", "memberships", "remove"],
    ["concepts", "jwt-auth"],
    ["concepts", "rbac"],
    ["concepts", "workspace-memberships"],
  ];

  return paths.map((slug) => ({ slug }));
}
