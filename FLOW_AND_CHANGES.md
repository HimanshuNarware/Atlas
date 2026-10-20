# DocReader — Architecture Flow & Implementation Changes

This document details the newly implemented **RAG (Retrieval-Augmented Generation)** pipeline for DocReader across the `/upload` and `/ans` endpoints, including the chunking strategy, Google GenAI SDK integration (`@google/genai`), Qdrant Cloud vector search, and simultaneous question-answering workflows.

---

## 🏗️ 1. High-Level Flow Architecture

```text
[ USER / STUDENT ]
        |
        | 1. Uploads PDF (with optional initial question)
        v
[ EXPRESS / MULTER ]
        |
        | 2. File received in memory / temp file
        v
[ BINARY CONVERSION ]
        |
        | 3. fs.readFileSync reads raw PDF buffer
        v
[ PDF-PARSE EXTRACTOR ]
        |
        | 4. Extracts full text & per-page contents
        v
[ RECURSIVE CHUNKER ]
        |
        | 5. Splits text recursively (paragraphs -> lines -> sentences -> words)
        |    Chunk size: ~700 chars | Overlap: 100 chars | Stores length & page #
        v
[ GOOGLE GENAI EMBEDDINGS ]
        |
        | 6. gemini-embedding-001 generates 1536-dim dense vectors
        v
[ QDRANT VECTOR DATABASE ]
        |
        | 7. Upserts points into "doc_reader" collection (Cosine metric)
        |    Payload: { documentId, text, length, chunkIndex, pageNumber, filename }
        +-------------------------------------------------------------+
        |                                                             |
        v (If question provided at upload)                            v (Separate /ans call)
[ ONE-SHOT Q&A FLOW ]                                        [ /ANS ENDPOINT ]
        |                                                             |
        | 8. Embeds question using Google gemini-embedding-001        |
        v                                                             v
[ QDRANT COSINE SIMILARITY SEARCH ]                                   |
        |                                                             |
        | 9. Retrieves Top K (4) most relevant document chunks        |
        v                                                             v
[ GOOGLE GEMINI GENERATION ] <----------------------------------------+
        |
        | 10. gemini-2.5-flash receives user question + retrieved excerpts
        |     Strict grounding instructions (factual, citations, page references)
        v
[ GROUNDED ANSWER & CITATIONS ]
        |
        v
[ CLIENT RESPONSE ]
  {
    "answer": "...",
    "citations": [ { "pageNumber": 3, "chunkId": "...", "excerpt": "..." } ],
    "documentId": "..."
  }
```

---

## 🛠️ 2. Detailed Breakdown of Changes

### A. Packages Installed
1. **`@google/genai`**: Official new Google GenAI SDK used for:
   - Dense vector embeddings (`gemini-embedding-001`, 1536 dimensions).
   - Fast, cost-efficient grounded RAG answering (`gemini-2.5-flash`).
2. **`@qdrant/js-client-rest`**: Official Qdrant vector database client for collection initialization, payload indexing, batch upserts, and cosine similarity searches.
3. **`pdf-parse` & `@types/pdf-parse`**: High-performance PDF binary extraction tool providing page-by-page text mapping.
4. **`react-markdown` & `remark-gfm`**: Client-side Markdown rendering engine with GFM support for bold, tables, lists, code blocks, and blockquotes.

---

### B. Core Services & Components

1. **[`backend/src/utils/chunker.ts`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/backend/src/utils/chunker.ts)**:
   - **Recursive Character Splitting with Overlap**:
     - Evaluates natural linguistic separators in hierarchical order:
       1. Paragraph breaks (`\n\n`)
       2. Line breaks (`\n`)
       3. Sentence terminators (`. `)
       4. Word boundaries (` `)
     - Target size: ~700 characters.
     - Overlap: ~100 characters (preserves context across split boundaries).
   - Retains metadata: `chunkIndex`, `pageNumber`, `length`, `documentId`, `filename`.

2. **[`backend/src/integrations/google-genai.service.ts`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/backend/src/integrations/google-genai.service.ts)**:
   - Imports `GoogleGenAI` from `@google/genai`.
   - `embedText(text: string)`: Generates 1536-dim vector via `gemini-embedding-001`.
   - `embedBatch(texts: string[])`: Batched embedding generation for document chunks in high-throughput single calls.
   - `generateGroundedAnswer(question, contextChunks)`: Calls `gemini-2.5-flash` with low temperature (`0.2`) and strict system prompt requiring factual citations.

3. **[`backend/src/integrations/qdrant.service.ts`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/backend/src/integrations/qdrant.service.ts)**:
   - Connects to remote Qdrant Cloud or local cluster with `1536` dimensions and `Cosine` similarity.
   - Auto-creates keyword payload index on `documentId` for strict filtered queries.

4. **[`client/src/components/GeminiThinkingLoader.tsx`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/client/src/components/GeminiThinkingLoader.tsx)**:
   - **Claude-Style Minimal Aesthetic**: Replaced verbose provider/database text with clean, elegant rotating phrases (`Thinking...`, `Reading document...`, `Generating...`).
   - Smooth terracotta sunburst star icon with delicate pulsing spin and halo animations.
   - Clean, non-distracting visual presence across chat stream, upload dropzone, top bar button, and status pill.

5. **[`client/src/components/MarkdownRenderer.tsx`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/client/src/components/MarkdownRenderer.tsx)**:
   - Renders rich Markdown responses with bullet points, headers, monospace code, tables, and blockquotes.
   - Added `inverted` mode support for crisp high-contrast readability inside dark chat bubbles.

6. **UI/UX Transformations (`client/src/App.tsx` & `client/src/index.css`)**:
   - **Messenger-Style Chat Alignment**: User messages and avatar (Deer) right-aligned with dark high-contrast bubble; Atlas messages and avatar (Cat) left-aligned with clean white card bubble.
   - **Evidence Criteria & Reasoning Card Placement**: Rendered immediately **after the question** and before the agent's answer, featuring page number badge, match percentage, exact quote excerpt, and reasoning criteria. The Revoke/Confirm button has been completely removed.
   - **Specialists Card Replacement**: Replaced "Specialists in Room" card with a **"Need Help?"** interactive guide card and a **"New Model Coming Soon"** teaser card.
   - **Interactive Tooltips**: Added helpful tooltips on the `+ Upload PDF` button, sidebar dropzone, and chat attachment `📎` button.
   - **Hand-Drawn Typography**: Integrated `Shantell Sans`, `Patrick Hand`, and `Caveat` variable Google Fonts across the application for a warm, human-crafted Hilos aesthetic.

4. **[`src/services/doc-reader.service.ts`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/backend/src/services/doc-reader.service.ts)**:
   - Orchestrates the full lifecycle:
     - `processPdfUpload(...)`:
       - Binary read with `fs.readFileSync`.
       - Extraction with `pdf-parse`.
       - Recursive chunking.
       - Vector generation via Google GenAI.
       - Qdrant upsert.
       - **Simultaneous Question Answering**: If `question` was provided with upload, immediately executes vector search + Gemini generation and returns the answer in the same response!
     - `answerQuestion(...)`:
       - Embeds question.
       - Retrieves top matching chunks from Qdrant.
       - Generates answer with citations using Gemini.
     - `getHistory(...)`:
       - Returns repository documents and question counts.

5. **[`src/controllers/doc-reader.controller.ts`](file:///home/himanshu/Desktop/Full%20stack%20concept%20practice/DocReader/backend/src/controllers/doc-reader.controller.ts)**:
   - Connected `upload`, `ans`, and `history` to `docReaderService`.

---

## ⚙️ 3. Environment Variables Configuration

In `backend/.env`:

```env
# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# Qdrant Vector Database (Remote / Qdrant Cloud or Local)
QDRANT_URL=https://your-cluster-id.us-east-1-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-cloud-api-key
QDRANT_COLLECTION=docreader_documents
```

*(Note: If using local Docker Qdrant, set `QDRANT_URL=http://localhost:6333`)*

---

## 📡 4. Endpoint Usage & Example Commands

### A. Upload PDF Only
```bash
curl -X POST http://localhost:5000/docReaderRouter/upload \
  -F "file=@your_book.pdf"
```
**Response**:
```json
{
  "success": true,
  "message": "Document uploaded and indexed successfully into vector store.",
  "data": {
    "documentId": "c4d7ec94-2ef5-46eb-81dc-fb9cb3da3bf0",
    "filename": "your_book.pdf",
    "chunksCount": 42,
    "status": "ready"
  }
}
```

---

### B. Simultaneous Upload & Ask Question (One-Shot Flow)
```bash
curl -X POST http://localhost:5000/docReaderRouter/upload \
  -F "file=@your_book.pdf" \
  -F "question=What is the main hypothesis tested in chapter 2?"
```
**Response**:
```json
{
  "success": true,
  "message": "Document uploaded, indexed, and initial question answered successfully.",
  "data": {
    "documentId": "c4d7ec94-2ef5-46eb-81dc-fb9cb3da3bf0",
    "filename": "your_book.pdf",
    "chunksCount": 42,
    "status": "ready",
    "answer": "In Chapter 2, the author hypothesizes that...",
    "citations": [
      {
        "pageNumber": 14,
        "chunkId": "f784d123-...",
        "excerpt": "Our primary hypothesis posits that..."
      }
    ]
  }
}
```

---

### C. Ask Question on Existing Document (`/ans`)
```bash
curl -X POST http://localhost:5000/docReaderRouter/ans \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What conclusions are reached in the final section?",
    "documentId": "c4d7ec94-2ef5-46eb-81dc-fb9cb3da3bf0"
  }'
```
**Response**:
```json
{
  "success": true,
  "message": "Question answered successfully with verified citations.",
  "data": {
    "question": "What conclusions are reached in the final section?",
    "documentId": "c4d7ec94-2ef5-46eb-81dc-fb9cb3da3bf0",
    "answer": "The final section concludes that...",
    "citations": [
      {
        "pageNumber": 88,
        "chunkId": "a1b2c3d4-...",
        "excerpt": "We conclude that the evidence strongly supports..."
      }
    ],
    "retrievedChunksCount": 4
  }
}
```

---

### D. Document History (`/history`)
```bash
curl http://localhost:5000/docReaderRouter/history
```
