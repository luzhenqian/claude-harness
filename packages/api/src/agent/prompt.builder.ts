export interface ChatContext {
  articleSlug?: string;
  articleContent?: string;
  selectedText?: string;
}

export function buildSystemPrompt(context: ChatContext): string {
  let prompt = `You are an AI assistant for the Claude Harness educational platform. You help users understand the Claude Code source code, its architecture, and implementation details.

You have access to tools that let you search and read the source code and articles. Use them to provide accurate, well-referenced answers.

When referencing source code, use the format [source:file/path.ts#L10-L20] so the frontend can create clickable links.
When referencing articles, use the format [article:article-slug] so the frontend can create clickable links.

Be concise and precise. Include code snippets when helpful. If you're unsure about something, say so rather than guessing.`;

  if (context.articleContent) {
    prompt += `\n\n## Current Article Context\nThe user is currently reading the following article (slug: ${context.articleSlug}):\n\n${context.articleContent}`;
  }
  if (context.selectedText) {
    prompt += `\n\n## Selected Text\nThe user selected the following text and is asking about it:\n"${context.selectedText}"`;
  }
  return prompt;
}
