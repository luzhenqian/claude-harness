import { Injectable } from '@nestjs/common';
import { Project, SyntaxKind } from 'ts-morph';

export interface CodeChunkData {
  filePath: string;
  chunkType: string;
  name: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class CodeIndexerService {
  parseSource(filePath: string, source: string): CodeChunkData[] {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', source);
    const chunks: CodeChunkData[] = [];

    // Functions
    for (const fn of sourceFile.getFunctions()) {
      chunks.push({
        filePath, chunkType: 'function', name: fn.getName() || 'anonymous',
        content: fn.getFullText().trim(),
        startLine: fn.getStartLineNumber(), endLine: fn.getEndLineNumber(),
        metadata: {
          params: fn.getParameters().map((p) => p.getText()),
          returnType: fn.getReturnTypeNode()?.getText() || '',
          isExported: fn.isExported(),
          jsdoc: fn.getJsDocs().map((d) => d.getDescription()).join('\n'),
        },
      });
    }

    // Arrow functions assigned to variables
    for (const varDecl of sourceFile.getVariableDeclarations()) {
      const init = varDecl.getInitializer();
      if (init && init.getKind() === SyntaxKind.ArrowFunction) {
        const parent = varDecl.getVariableStatement();
        chunks.push({
          filePath, chunkType: 'function', name: varDecl.getName(),
          content: (parent || varDecl).getFullText().trim(),
          startLine: (parent || varDecl).getStartLineNumber(), endLine: varDecl.getEndLineNumber(),
          metadata: { isExported: parent?.isExported() || false, isArrow: true },
        });
      }
    }

    // Classes
    for (const cls of sourceFile.getClasses()) {
      chunks.push({
        filePath, chunkType: 'class', name: cls.getName() || 'anonymous',
        content: cls.getFullText().trim(),
        startLine: cls.getStartLineNumber(), endLine: cls.getEndLineNumber(),
        metadata: {
          methods: cls.getMethods().map((m) => m.getName()),
          properties: cls.getProperties().map((p) => p.getName()),
          isExported: cls.isExported(),
          jsdoc: cls.getJsDocs().map((d) => d.getDescription()).join('\n'),
        },
      });
    }

    // Interfaces
    for (const iface of sourceFile.getInterfaces()) {
      chunks.push({
        filePath, chunkType: 'interface', name: iface.getName(),
        content: iface.getFullText().trim(),
        startLine: iface.getStartLineNumber(), endLine: iface.getEndLineNumber(),
        metadata: { properties: iface.getProperties().map((p) => p.getName()), isExported: iface.isExported() },
      });
    }

    // Type aliases
    for (const ta of sourceFile.getTypeAliases()) {
      chunks.push({
        filePath, chunkType: 'type', name: ta.getName(),
        content: ta.getFullText().trim(),
        startLine: ta.getStartLineNumber(), endLine: ta.getEndLineNumber(),
        metadata: { isExported: ta.isExported() },
      });
    }

    return chunks;
  }

  buildDescriptionText(chunk: CodeChunkData): string {
    const parts = [`File: ${chunk.filePath}`, `${chunk.chunkType}: ${chunk.name}`];
    if (chunk.metadata.params) parts.push(`Parameters: ${(chunk.metadata.params as string[]).join(', ')}`);
    if (chunk.metadata.returnType) parts.push(`Returns: ${chunk.metadata.returnType}`);
    if (chunk.metadata.jsdoc) parts.push(`Description: ${chunk.metadata.jsdoc}`);
    parts.push('', chunk.content);
    return parts.join('\n');
  }
}
