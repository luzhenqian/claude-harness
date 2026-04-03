import { Injectable } from '@nestjs/common';
import matter from 'gray-matter';

export interface ArticleChunkData {
  articleSlug: string;
  locale: string;
  heading: string;
  content: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ArticleIndexerService {
  parseArticle(slug: string, locale: string, raw: string): ArticleChunkData[] {
    const { data: frontmatter, content } = matter(raw);
    const chunks: ArticleChunkData[] = [];

    const sections = content.split(/^(?=## )/m).filter((s) => s.trim());

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const headingMatch = lines[0].match(/^#{2,3}\s+(.+)/);
      const heading = headingMatch ? headingMatch[1].trim() : 'Introduction';
      const body = headingMatch ? lines.slice(1).join('\n').trim() : section.trim();
      if (!body) continue;

      const subSections = body.split(/^(?=### )/m).filter((s) => s.trim());

      if (subSections.length > 1) {
        const firstPart = subSections[0];
        if (!firstPart.startsWith('### ') && firstPart.trim()) {
          chunks.push({
            articleSlug: slug, locale, heading, content: firstPart.trim(),
            metadata: { title: frontmatter.title, tags: frontmatter.tags, order: frontmatter.order },
          });
        }
        for (const sub of subSections) {
          const subMatch = sub.match(/^### (.+)/);
          if (subMatch) {
            const subHeading = `${heading} > ${subMatch[1].trim()}`;
            const subBody = sub.split('\n').slice(1).join('\n').trim();
            if (subBody) {
              chunks.push({
                articleSlug: slug, locale, heading: subHeading, content: subBody,
                metadata: { title: frontmatter.title, tags: frontmatter.tags, order: frontmatter.order },
              });
            }
          }
        }
      } else {
        chunks.push({
          articleSlug: slug, locale, heading, content: body,
          metadata: { title: frontmatter.title, tags: frontmatter.tags, order: frontmatter.order },
        });
      }
    }
    return chunks;
  }

  buildDescriptionText(chunk: ArticleChunkData): string {
    const parts = [`Article: ${chunk.metadata.title || chunk.articleSlug}`, `Section: ${chunk.heading}`];
    if (chunk.metadata.tags) parts.push(`Tags: ${(chunk.metadata.tags as string[]).join(', ')}`);
    const maxContentChars = 6000;
    const content = chunk.content.length > maxContentChars
      ? chunk.content.slice(0, maxContentChars) + '\n... truncated'
      : chunk.content;
    parts.push('', content);
    return parts.join('\n');
  }
}
