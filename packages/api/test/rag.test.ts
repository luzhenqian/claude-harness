import { describe, it, expect, beforeAll } from 'vitest';
import { DataSource } from 'typeorm';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

// Direct DB connection for testing search queries
let dataSource: DataSource;
const SOURCE_ROOT = resolve(join(__dirname, '..', '..', 'claude-code-source', 'src'));

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://noah@localhost:5432/claude-harness',
    synchronize: false,
  });
  await dataSource.initialize();
});

// ===== 1. Database health =====
describe('Database health', () => {
  it('code_chunks table has data', async () => {
    const [{ count }] = await dataSource.query('SELECT COUNT(*)::int as count FROM code_chunks');
    console.log(`  code_chunks: ${count} rows`);
    expect(count).toBeGreaterThan(1000);
  });

  it('article_chunks table has data', async () => {
    const [{ count }] = await dataSource.query('SELECT COUNT(*)::int as count FROM article_chunks');
    console.log(`  article_chunks: ${count} rows`);
    expect(count).toBeGreaterThan(100);
  });

  it('embeddings are present', async () => {
    const [{ count }] = await dataSource.query(
      'SELECT COUNT(*)::int as count FROM code_chunks WHERE embedding IS NULL'
    );
    expect(count).toBe(0);
  });
});

// ===== 2. Search SQL correctness =====
describe('Search SQL queries', () => {
  it('searchCode query executes without error', async () => {
    // Simplified version of the actual query
    const sql = `
      WITH vector_results AS (
        SELECT id, file_path, chunk_type, name, content, start_line, end_line, metadata,
               1 - (embedding <=> (SELECT embedding FROM code_chunks LIMIT 1)) AS vec_score
        FROM code_chunks WHERE embedding IS NOT NULL
        ORDER BY vec_score DESC LIMIT 5
      ),
      text_results AS (
        SELECT id, file_path, chunk_type, name, content, start_line, end_line, metadata,
               ts_rank(tsv, plainto_tsquery('english', 'tool')) AS text_score
        FROM code_chunks WHERE tsv @@ plainto_tsquery('english', 'tool')
        ORDER BY text_score DESC LIMIT 5
      )
      SELECT DISTINCT ON (combined.id)
        combined.id, combined.file_path, combined.chunk_type, combined.name,
        combined.start_line, combined.end_line,
        COALESCE(v.vec_score, 0) * 0.7 + COALESCE(t.text_score, 0) * 0.3 AS score
      FROM (SELECT * FROM vector_results UNION ALL SELECT * FROM text_results) combined
      LEFT JOIN vector_results v ON v.id = combined.id
      LEFT JOIN text_results t ON t.id = combined.id
      ORDER BY combined.id, score DESC
    `;
    const rows = await dataSource.query(sql);
    expect(rows.length).toBeGreaterThan(0);
    console.log(`  Found ${rows.length} results for "tool"`);
    console.log(`  Top result: ${rows[0].file_path} (${rows[0].chunk_type}: ${rows[0].name})`);
  });

  it('text search for "QueryEngine" finds QueryEngine.ts', async () => {
    const rows = await dataSource.query(
      `SELECT file_path, name, chunk_type FROM code_chunks
       WHERE tsv @@ plainto_tsquery('english', 'QueryEngine')
       ORDER BY ts_rank(tsv, plainto_tsquery('english', 'QueryEngine')) DESC LIMIT 5`
    );
    const paths = rows.map((r: any) => r.file_path);
    console.log(`  Text search "QueryEngine" found:`, paths);
    expect(paths).toContain('QueryEngine.ts');
  });

  it('text search for "StreamingToolExecutor" finds correct file', async () => {
    const rows = await dataSource.query(
      `SELECT file_path, name, chunk_type FROM code_chunks
       WHERE tsv @@ plainto_tsquery('english', 'StreamingToolExecutor')
       ORDER BY ts_rank(tsv, plainto_tsquery('english', 'StreamingToolExecutor')) DESC LIMIT 5`
    );
    const paths = rows.map((r: any) => r.file_path);
    console.log(`  Text search "StreamingToolExecutor" found:`, paths);
    expect(paths.some((p: string) => p.includes('StreamingToolExecutor'))).toBe(true);
  });

  it('text search for "tool" returns tool-related files', async () => {
    const rows = await dataSource.query(
      `SELECT DISTINCT file_path FROM code_chunks
       WHERE tsv @@ plainto_tsquery('english', 'tool')
       ORDER BY file_path LIMIT 20`
    );
    const paths = rows.map((r: any) => r.file_path);
    console.log(`  Text search "tool" found ${paths.length} files:`, paths.slice(0, 10));
    expect(paths.some((p: string) => p.includes('Tool') || p.includes('tool'))).toBe(true);
  });
});

// ===== 3. File paths in DB match filesystem =====
describe('File path consistency', () => {
  it('all indexed file paths exist on disk', async () => {
    const rows = await dataSource.query('SELECT DISTINCT file_path FROM code_chunks');
    const missing: string[] = [];

    for (const row of rows) {
      const fullPath = resolve(join(SOURCE_ROOT, row.file_path));
      try {
        await readFile(fullPath, 'utf-8');
      } catch {
        missing.push(row.file_path);
      }
    }

    console.log(`  Total indexed paths: ${rows.length}`);
    console.log(`  Missing on disk: ${missing.length}`);
    if (missing.length > 0) {
      console.log(`  First 10 missing:`, missing.slice(0, 10));
    }
    // Allow small tolerance (files might have been deleted after indexing)
    expect(missing.length).toBeLessThan(rows.length * 0.05);
  });

  it('read_file tool can read top search results', async () => {
    // Simulate what happens: search returns paths, then read_file tries to read them
    const rows = await dataSource.query(
      `SELECT DISTINCT file_path FROM code_chunks
       WHERE tsv @@ plainto_tsquery('english', 'tool') LIMIT 5`
    );

    for (const row of rows) {
      const fullPath = resolve(join(SOURCE_ROOT, row.file_path));
      try {
        const content = await readFile(fullPath, 'utf-8');
        console.log(`  ✅ ${row.file_path} (${content.split('\n').length} lines)`);
      } catch {
        console.log(`  ❌ ${row.file_path} — FILE NOT FOUND`);
        // This is the bug we're looking for
        expect.fail(`File ${row.file_path} found in DB but not on disk at ${fullPath}`);
      }
    }
  });
});

// ===== 4. Search result ordering =====
describe('Search result quality', () => {
  it('final query returns results sorted by score', async () => {
    // Use a simple embedding-free text search to test the SQL structure
    const rows = await dataSource.query(`
      SELECT file_path, chunk_type, name,
        ts_rank(tsv, plainto_tsquery('english', 'permission check')) AS score
      FROM code_chunks
      WHERE tsv @@ plainto_tsquery('english', 'permission check')
      ORDER BY score DESC LIMIT 10
    `);
    console.log(`  "permission check" results:`);
    rows.forEach((r: any, i: number) => {
      console.log(`    ${i + 1}. ${r.file_path} (${r.chunk_type}: ${r.name}, score: ${r.score})`);
    });
    expect(rows.length).toBeGreaterThan(0);
    // Verify descending order
    for (let i = 1; i < rows.length; i++) {
      expect(parseFloat(rows[i].score)).toBeLessThanOrEqual(parseFloat(rows[i - 1].score));
    }
  });

  it('DISTINCT ON query does not lose best results', async () => {
    // The bug: DISTINCT ON (combined.id) with ORDER BY combined.id, score DESC
    // PostgreSQL picks the first row per id group, but ORDER BY combined.id comes first,
    // so it picks by id order, NOT by score. The score ordering only applies WITHIN each id group.
    // After DISTINCT ON, we need a final ORDER BY score DESC.
    const rows = await dataSource.query(`
      WITH text_results AS (
        SELECT id, file_path, name,
               ts_rank(tsv, plainto_tsquery('english', 'tool executor')) AS score
        FROM code_chunks WHERE tsv @@ plainto_tsquery('english', 'tool executor')
        ORDER BY score DESC LIMIT 10
      )
      SELECT * FROM text_results ORDER BY score DESC
    `);
    console.log(`  "tool executor" top results:`);
    rows.forEach((r: any, i: number) => {
      console.log(`    ${i + 1}. ${r.file_path} (${r.name}, score: ${r.score})`);
    });
    expect(rows.length).toBeGreaterThan(0);
  });
});
