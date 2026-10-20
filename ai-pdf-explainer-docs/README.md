# AI PDF Explainer

An AI-powered application where users upload PDF documents and ask questions grounded in the content of those documents.

> **Project status:** Planning / pre-implementation  
> **Documentation status:** Initial baseline — update decisions marked `TBD` before production implementation.

## Goals

- Upload and manage PDF documents.
- Extract text, split it into searchable chunks, generate embeddings, and store vectors in Qdrant.
- Answer user questions using retrieved passages from the selected PDF(s).
- Show source citations so users can verify answers against the original document.
- Provide a clear, responsive interface with useful loading, empty, and error states.

## Technology baseline

| Area | Choice |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Node.js, TypeScript, Express (recommended; confirm before implementation) |
| Architecture | Component-based frontend; MVC-oriented backend with a service layer |
| Vector database | Qdrant |
| Package manager | npm |
| Code guidance | `node-backend-pattern` / `nodejs-backend-patterns` (confirm installed skill slug), `typescript-best-practices` |
| LLM provider | TBD |
| Embedding provider/model | TBD |
| PDF binary storage | TBD — do not use Qdrant as the primary PDF file store |
| Authentication | TBD |
| Deployment | TBD |

## How it works

1. A user uploads a PDF.
2. The backend validates the file and stores the original PDF in the configured file/object storage.
3. A background-capable ingestion flow extracts text and metadata, then splits text into chunks.
4. The embedding provider converts each chunk into a vector.
5. Vectors and searchable metadata are upserted into Qdrant in batches.
6. The user asks a question about a selected document.
7. The backend embeds the question, retrieves relevant chunks from Qdrant, and passes those chunks to the selected LLM.
8. The LLM returns an answer with citations referencing the retrieved chunks/pages.
9. The frontend displays the answer and source references.

## Documentation map

- [`PRINCIPLES.md`](./PRINCIPLES.md) — engineering rules and coding standards.
- [`REQUIREMENTS.md`](./REQUIREMENTS.md) — functional and non-functional requirements.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, layers, data flow, and boundaries.
- [`API_SPEC.md`](./API_SPEC.md) — initial HTTP API contract.
- [`DATA_MODEL.md`](./DATA_MODEL.md) — entities, metadata, and Qdrant payload design.
- [`SECURITY.md`](./SECURITY.md) — security and privacy requirements.
- [`TESTING.md`](./TESTING.md) — testing strategy and acceptance expectations.
- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) — staged implementation plan.
- [`DECISIONS.md`](./DECISIONS.md) — architecture decision log.

## Local development

Local setup commands will be added after the repository, package layout, and infrastructure choices are finalized. Do not commit secrets. Keep a `.env.example` containing variable names and safe placeholders, never real credentials.

## Definition of done

A feature is not complete merely because its happy path works. It should include relevant validation, authorization, error handling, loading/empty states, tests, logs where appropriate, and updated documentation.
