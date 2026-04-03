/**
 * Estimate reading time from markdown/MDX content.
 *
 * - English/Latin text: 238 WPM (Medium's rate)
 * - CJK characters (Chinese/Japanese/Korean): 500 chars/min (industry standard, matches `reading-time` npm)
 * - Code blocks: 200 WPM (blog readers scan code, not read every token)
 * - Images: first 12s, decreasing by 1s down to 3s minimum
 */

const WORDS_PER_MINUTE = 238;
const CJK_CHARS_PER_MINUTE = 500;
const CODE_WORDS_PER_MINUTE = 200;
const IMAGE_SECONDS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]; // first 10 images, then 3s each

// Match CJK Unified Ideographs, Hiragana, Katakana, Hangul
const CJK_REGEX = /[\u2E80-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF]/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const IMAGE_REGEX = /!\[.*?\]\(.*?\)|<img\s/g;

export function estimateReadingTime(content: string): number {
  // 1. Extract and measure code blocks
  const codeBlocks: string[] = [];
  const textWithoutCode = content.replace(CODE_BLOCK_REGEX, (match) => {
    codeBlocks.push(match);
    return ""; // remove from prose
  });

  // 2. Count images
  const imageCount = (textWithoutCode.match(IMAGE_REGEX) || []).length;

  // 3. Measure prose: separate CJK characters from Latin words
  const cjkChars = (textWithoutCode.match(CJK_REGEX) || []).length;
  // Remove CJK chars, markdown syntax, and extra whitespace to count Latin words
  const latinText = textWithoutCode
    .replace(CJK_REGEX, " ")
    .replace(/[#*_\[\]()>|~`{}<]/g, " ") // strip markdown syntax
    .replace(/https?:\/\/\S+/g, "") // strip URLs
    .replace(/---+/g, "") // strip horizontal rules
    .trim();
  const latinWords = latinText.split(/\s+/).filter((w) => w.length > 0).length;

  // 4. Measure code blocks
  const codeText = codeBlocks.join("\n");
  const codeWords = codeText
    .replace(/```\w*/g, "") // strip fences
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // 5. Calculate minutes
  const proseMinutes = latinWords / WORDS_PER_MINUTE;
  const cjkMinutes = cjkChars / CJK_CHARS_PER_MINUTE;
  const codeMinutes = codeWords / CODE_WORDS_PER_MINUTE;

  let imageSeconds = 0;
  for (let i = 0; i < imageCount; i++) {
    imageSeconds += IMAGE_SECONDS[Math.min(i, IMAGE_SECONDS.length - 1)];
  }
  const imageMinutes = imageSeconds / 60;

  const totalMinutes = proseMinutes + cjkMinutes + codeMinutes + imageMinutes;

  // Round to nearest integer, minimum 1 minute
  return Math.max(1, Math.round(totalMinutes));
}
