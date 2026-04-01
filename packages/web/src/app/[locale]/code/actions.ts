"use server";

import { readSourceFile } from "@/lib/source";

export async function fetchSourceCode(
  filePath: string,
): Promise<{ code: string | null; error: string | null }> {
  try {
    const code = await readSourceFile(filePath);
    return { code, error: null };
  } catch {
    return { code: null, error: `File not found: ${filePath}` };
  }
}
