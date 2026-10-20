# Testing Strategy

## Testing layers

### Unit tests
- Request validators and error mapping.
- Chunking and page metadata preservation.
- Stable chunk ID generation and idempotency.
- Citation mapping and insufficient-evidence decisions.
- Service-level business rules.
- Environment configuration validation.

### Integration tests
- API routes, middleware, controllers, and services.
- Qdrant adapter with an isolated test collection or controlled test instance.
- PDF parsing for valid, malformed, empty, and image-only samples.
- Embedding/LLM adapters using mocks for deterministic tests.
- Document deletion and partial-failure retry behavior.

### End-to-end tests
- Upload PDF → processing status → ready.
- Ask a question → answer with valid citations.
- Ask a question with no supporting evidence → safe insufficient-evidence response.
- Upload invalid/oversized PDF → clear error.
- Delete document → document can no longer be queried.
- Verify unauthorized users cannot access other users' documents.

### Frontend tests
- Upload validation and progress states.
- Document status and failure rendering.
- Chat submission, loading state, retry, and error state.
- Citation display and navigation.
- Keyboard accessibility for core flows.

## AI evaluation

Maintain a small, versioned evaluation set of PDFs and questions with expected supporting pages/passages. Measure:
- Retrieval relevance.
- Citation correctness.
- Answer faithfulness to retrieved evidence.
- Appropriate refusal/insufficient-evidence behavior.
- Latency and cost per question.

Do not use only “the answer sounds good” as the quality metric. Re-run evaluations when changing chunking, embedding models, prompts, or LLMs.

## CI checks

At minimum, configure:
- Formatting.
- Lint.
- Type checking.
- Unit and integration tests.
- Build.
- Dependency/security checks appropriate to the repository.

Use the actual package scripts defined by the project. Never claim a check passed unless it ran successfully.
