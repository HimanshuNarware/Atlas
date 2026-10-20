# System Architecture

## 1. Architectural approach

- **Frontend:** Next.js + React + TypeScript using a feature-oriented, component-based structure.
- **Backend:** Node.js + TypeScript + Express (recommended) using MVC plus a service layer.
- **Vector search:** Qdrant.
- **AI pipeline:** PDF extraction → chunking → embeddings → vector upsert → retrieval → LLM answer with citations.
- **Original PDF storage:** separate file/object storage; Qdrant is not the primary file store.

Provider, authentication, storage, and background-worker choices remain `TBD` until recorded in `DECISIONS.md`.

## 2. High-level components

```text
Browser
  |
  v
Next.js UI
  |  typed API client
  v
Node.js / Express API
  |
  +--> Routes + Middleware
  |       |
  |       v
  |    Controllers
  |       |
  |       v
  |    Services
  |       +--> Document service
  |       +--> Ingestion service
  |       +--> Retrieval / chat service
  |       +--> Citation service
  |
  +--> PDF parser / chunker
  +--> Embedding provider adapter
  +--> LLM provider adapter
  +--> Qdrant adapter
  +--> File/object storage adapter
  +--> Metadata/conversation persistence (choice TBD)
```

## 3. Backend MVC responsibilities

Suggested source layout:

```text
backend/
  src/
    config/
    routes/
    controllers/
    services/
    repositories/
    models/
    validators/
    middlewares/
    integrations/
      qdrant/
      embeddings/
      llm/
      pdf/
      storage/
    jobs/                 # if a worker is introduced
    utils/
    app.ts
    server.ts
  tests/
```

- **Routes:** declare paths, middleware, and controller handlers.
- **Controllers:** translate HTTP input/output; no chunking, embedding, retrieval, or domain workflows inline.
- **Services:** orchestrate document lifecycle, ingestion, retrieval, chat, and deletion.
- **Repositories:** encapsulate persistence queries when a separate abstraction helps.
- **Models:** define application data models/schema where a metadata database is selected.
- **Integrations/adapters:** isolate provider SDKs and external services.
- **Jobs:** execute expensive/retryable processing outside the request lifecycle when required.

MVC is the organizing pattern; services and integrations prevent controllers from becoming overly complex.

## 4. Frontend component architecture

Suggested layout:

```text
frontend/
  src/
    app/                         # Next.js routes/layouts
    components/
      ui/                        # generic accessible primitives
      layout/                    # navigation, shell, page layout
    features/
      documents/
        components/
        hooks/
        api/
        types.ts
      chat/
        components/
        hooks/
        api/
        types.ts
      upload/
        components/
        hooks/
        api/
    lib/
      api-client.ts
      env.ts
    types/
```

Rules:
- Keep route files focused on page composition and route-level concerns.
- Keep reusable UI components independent from PDF/chat business rules.
- Keep feature-specific components, hooks, API functions, and types near their feature.
- Use server components by default where suitable; use client components only for interactivity/browser APIs.
- Keep secrets and server-only SDKs out of client bundles.
- Avoid creating a generic abstraction until at least one real use case justifies it.

## 5. PDF ingestion flow

1. Validate file type, signature, size, page count, and user quota.
2. Create a document record/status if metadata persistence is selected.
3. Store the original PDF outside Qdrant.
4. Mark the document `processing`.
5. Extract text with page boundaries and useful metadata.
6. Detect empty extraction; report OCR limitation if the PDF is image-only.
7. Split text into chunks with configurable size and overlap.
8. Generate embeddings using the selected embedding model.
9. Upsert vectors in batches with stable point IDs and compact payloads.
10. Mark the document `ready`; on failure, record a safe failure status and allow retry.

For production workloads, run steps 4–10 in a worker/queue so HTTP requests do not remain open during long processing. The queue technology is `TBD`; do not add one until deployment and workload needs are understood.

## 6. Question-answering flow

1. Authenticate the user and authorize access to the selected document.
2. Validate the question and apply rate/usage limits.
3. Embed the question using the same compatible embedding model used for document chunks.
4. Search Qdrant with filters for document ID and access/tenant scope.
5. Select relevant chunks and preserve source metadata.
6. Build a prompt that treats retrieved PDF text as untrusted reference material, not instructions.
7. Ask the configured LLM to answer only from supported evidence.
8. Return answer text plus citations (page and source chunk references).
9. Store conversation data only according to the selected persistence and retention policy.

## 7. Qdrant design

- Use a collection configured for the selected embedding model's vector dimension and distance metric.
- Use stable point IDs so retries can be idempotent.
- Upsert in batches.
- Include payload fields such as `documentId`, `ownerId`/tenant scope, `pageNumber`, `chunkIndex`, `text`, and optional filename/source metadata.
- Apply document and ownership filters to every relevant retrieval query.
- Do not store the entire PDF binary in Qdrant.
- Plan for re-indexing when chunking or embedding models change; record an embedding/index version.
- Decide how deletion is verified and how orphaned vectors are cleaned up.

## 8. Persistence boundaries

Qdrant is the vector database, not automatically the complete application database. The application may also need durable storage for users, document status, file locations, conversations, usage limits, and job status. Choose a metadata database and storage policy before implementation; both are currently `TBD`.

## 9. Error handling and observability

- Validate inputs at the edge.
- Use a consistent error response schema.
- Add request IDs and structured logs.
- Set timeouts and handle provider rate limits.
- Avoid leaking provider internals to clients.
- Track ingestion duration/failure, retrieval result counts, model latency, and token/usage metrics where supported.
- Do not log full extracted chunks by default.

## 10. Architecture boundaries

- Frontend talks to the backend API; it must not connect directly to Qdrant or expose provider secrets.
- Controllers call services; services coordinate workflows.
- Provider SDK calls stay behind integration adapters.
- File storage and vector storage are separate responsibilities.
- All document access is checked server-side, not merely hidden in the UI.
