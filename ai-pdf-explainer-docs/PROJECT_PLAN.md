# Project Plan — Build from Scratch

## Phase 0: Resolve decisions

- [ ] Confirm repository layout: monorepo or separate frontend/backend repositories.
- [ ] Confirm backend framework (Express is the current recommendation).
- [ ] Select LLM provider/model.
- [ ] Select embedding provider/model and vector dimensions.
- [ ] Select PDF parser and decide OCR scope.
- [ ] Select original-file storage.
- [ ] Decide whether a metadata database is needed and select it.
- [ ] Decide authentication, ownership, and conversation persistence.
- [ ] Define PDF limits, rate limits, and retention policy.
- [ ] Choose deployment target and whether background jobs are needed.

## Phase 1: Foundation

- [ ] Create frontend and backend TypeScript projects.
- [ ] Add linting, formatting, strict type checks, and test runners.
- [ ] Add validated environment configuration and `.env.example`.
- [ ] Establish API response/error conventions.
- [ ] Add structured logging and request IDs.
- [ ] Add Docker Compose for local dependencies when the service choices are known.
- [ ] Add CI for lint, type-check, tests, and build.
- [ ] Add `AGENTS.md` and configure the required coding skills in the chosen agent.

## Phase 2: Vertical slice — PDF upload

- [ ] Build the upload UI.
- [ ] Implement backend upload validation.
- [ ] Store the original PDF in the selected storage.
- [ ] Create document status tracking.
- [ ] Show processing and error states.
- [ ] Test invalid files, size limits, and storage failures.

## Phase 3: Ingestion and Qdrant

- [ ] Extract text and page metadata.
- [ ] Implement chunking with configurable size/overlap.
- [ ] Implement embedding adapter.
- [ ] Create/configure Qdrant collection for the selected vector model.
- [ ] Batch upsert vectors with stable IDs and ownership/document metadata.
- [ ] Add idempotent retry behavior.
- [ ] Mark documents ready only after indexing succeeds.
- [ ] Decide and implement background processing if needed.

## Phase 4: Question answering

- [ ] Embed the user question.
- [ ] Retrieve relevant chunks with authorization filters.
- [ ] Implement prompt construction and evidence-grounded answer generation.
- [ ] Validate citation IDs/pages against retrieved results.
- [ ] Handle insufficient evidence and provider failures.
- [ ] Add retrieval and answer evaluation cases.

## Phase 5: Product experience

- [ ] Document list and status details.
- [ ] Chat UI and follow-up questions.
- [ ] Citation display and source navigation.
- [ ] Delete document and verify cleanup.
- [ ] Responsive and accessible UI.
- [ ] Conversation persistence if approved.

## Phase 6: Production readiness

- [ ] Authentication and authorization tests.
- [ ] Rate limits, quotas, timeouts, and resource limits.
- [ ] Retention/deletion policy implemented.
- [ ] Security review and dependency checks.
- [ ] Monitoring, logs, alerts, and health checks.
- [ ] Load tests for representative PDF sizes and concurrent questions.
- [ ] Deployment, backup, recovery, and rollback procedures documented.

## Delivery rule

Ship vertical slices that work end-to-end. Avoid building every UI screen first and leaving ingestion/retrieval until the end.
