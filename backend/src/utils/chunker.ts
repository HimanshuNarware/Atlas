import crypto from 'node:crypto';

export interface DocumentChunk {
  id: string;
  text: string;
  length: number;
  chunkIndex: number;
  pageNumber: number;
  documentId: string;
  filename: string;
}

export interface PageContent {
  pageNumber: number;
  text: string;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Splits raw text recursively using natural separator boundaries:
 * 1. Double line break (\n\n) - Paragraphs
 * 2. Single line break (\n)   - Lines
 * 3. Sentence terminator (. ) - Sentences
 * 4. Whitespace ( )           - Words
 * 5. Character boundary
 */
export function recursiveSplitText(
  text: string,
  chunkSize = 700,
  chunkOverlap = 100
): string[] {
  if (!text || text.trim().length === 0) return [];

  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  const separators = ['\n\n', '\n', '. ', ' '];

  function split(content: string, depth = 0): string[] {
    if (content.length <= chunkSize) {
      const trimmed = content.trim();
      return trimmed.length > 0 ? [trimmed] : [];
    }

    if (depth >= separators.length) {
      // Hard split fallback when no natural separator is found
      const pieces: string[] = [];
      let i = 0;
      while (i < content.length) {
        pieces.push(content.slice(i, i + chunkSize));
        i += chunkSize - chunkOverlap;
      }
      return pieces;
    }

    const sep = separators[depth]!;
    const parts = content.split(sep);
    const accumulated: string[] = [];
    let currentChunk = '';

    for (const part of parts) {
      const candidate = currentChunk ? `${currentChunk}${sep}${part}` : part;
      if (candidate.length <= chunkSize) {
        currentChunk = candidate;
      } else {
        if (currentChunk.trim().length > 0) {
          accumulated.push(currentChunk.trim());
        }
        if (part.length > chunkSize) {
          // Part itself exceeds chunkSize, recurse with next separator
          const subPieces = split(part, depth + 1);
          accumulated.push(...subPieces);
          currentChunk = '';
        } else {
          currentChunk = part;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      accumulated.push(currentChunk.trim());
    }

    return accumulated;
  }

  const rawPieces = split(cleanedText);

  // Merge with overlap window
  let currentMerged = '';
  for (const piece of rawPieces) {
    if (!currentMerged) {
      currentMerged = piece;
    } else if (currentMerged.length + piece.length + 1 <= chunkSize) {
      currentMerged += ' ' + piece;
    } else {
      chunks.push(currentMerged);
      // Retain overlap from end of previous chunk
      const overlapSlice = currentMerged.slice(-chunkOverlap);
      currentMerged = overlapSlice + ' ' + piece;
    }
  }

  if (currentMerged.trim().length > 0) {
    chunks.push(currentMerged.trim());
  }

  return chunks.filter((c) => c.length >= 20); // filter out empty or micro fragments
}

/**
 * Chunks a multi-page document into DocumentChunk objects with full metadata
 */
export function chunkPages(
  pages: PageContent[],
  documentId: string,
  filename: string,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const { chunkSize = 700, chunkOverlap = 100 } = options;
  const result: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = recursiveSplitText(page.text, chunkSize, chunkOverlap);
    for (const chunkText of pageChunks) {
      result.push({
        id: crypto.randomUUID(),
        text: chunkText,
        length: chunkText.length,
        chunkIndex: globalChunkIndex++,
        pageNumber: page.pageNumber,
        documentId,
        filename,
      });
    }
  }

  return result;
}
