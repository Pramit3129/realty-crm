import fs from "fs";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { components } from "@/components/mdx-components";

const contentDir = path.join(process.cwd(), "content");

export async function getMDXContent(slug: string[]) {
  const slugPath = slug.join("/");
  const filePath = path.join(contentDir, `${slugPath}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const source = fs.readFileSync(filePath, "utf8");

  const { content, frontmatter } = await compileMDX<{
    title: string;
    description?: string;
  }>({
    source,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });

  return { content, frontmatter };
}

export function getAllMDXPaths() {
  const getFiles = (dir: string): string[] => {
    const files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...getFiles(fullPath));
      } else if (item.name.endsWith(".mdx")) {
        const relativePath = path.relative(contentDir, fullPath);
        const slug = relativePath.replace(/\.mdx$/, "").split(path.sep);
        files.push("/docs/" + slug.join("/"));
      }
    }

    return files;
  };

  return getFiles(contentDir);
}
