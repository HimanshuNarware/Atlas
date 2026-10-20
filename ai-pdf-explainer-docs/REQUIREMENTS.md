# Product Requirements — AI PDF Explainer

## 1. Product summary

Users upload a PDF and ask natural-language questions about its content. The application retrieves relevant passages and generates grounded answers with citations.

## 2. Goals

- Make long PDFs easier to understand.
- Let users ask follow-up questions about a document.
- Provide transparent answers with page/source references.
- Process PDFs reliably and communicate processing status.
- Protect users' documents from unauthorized access.

## 3. Users and primary journey

### Primary journey

1. User opens the application and signs in if authentication is enabled.
2. User uploads a PDF.
3. Application validates the file and shows upload/processing progress.
4. Application indicates when the document is ready to query.
5. User selects the document and asks a question.
6. Application displays an answer and citations.
7. User opens a citation to inspect the relevant page or source passage.
8. User asks a follow-up question or deletes the document.

Authentication and account requirements are **TBD**. For a private-document product, access control must be designed before multi-user deployment.

## 4. Functional requirements

### FR-01: PDF upload
- Accept PDF files only in the first release.
- Enforce configurable file-size and page-count limits.
- Validate MIME type and file signature; do not trust the filename or client-supplied content type alone.
- Use generated storage names rather than user-provided paths.
- Return a document ID and processing status.
- Reject unsupported, empty, malformed, encrypted, or otherwise unprocessable files with safe, actionable errors.

### FR-02: Document processing
- Extract text and page-level information where supported by the parser.
- Detect scanned/image-only PDFs and report that OCR is unsupported or required until OCR is implemented.
- Split extracted text into configurable chunks with appropriate overlap.
- Preserve document ID, page number(s), chunk index, and ownership/tenant metadata.
- Generate embeddings and upsert vectors into Qdrant in batches.
- Make processing status visible: `uploaded`, `processing`, `ready`, `failed`, `deleting`, `deleted`.
- Support retrying failed processing without creating duplicate vector points.

### FR-03: Ask questions
- Accept a question scoped to a selected document in the initial release.
- Retrieve relevant chunks from Qdrant, filtered by document and authorization scope.
- Generate an answer using retrieved evidence and the configured LLM.
- Include citations containing document ID and page/chunk references.
- If no useful evidence is retrieved, communicate that the document does not provide enough information.
- Handle provider timeouts, rate limits, empty results, and malformed provider responses.

### FR-04: Conversation
- Support follow-up questions in a conversation.
- Persist conversation history only if persistence is selected in the data/storage design.
- Do not assume prior assistant answers are authoritative evidence; retrieve supporting document content for each substantive answer.
- Define whether conversation history is scoped to one document or can span multiple documents. Initial recommendation: one selected document per conversation.

### FR-05: Document management
- List documents visible to the current user.
- Show document name, size, upload date, status, and processing errors where safe.
- Allow a user to delete their own document.
- Deletion must remove the original file and related vectors/metadata, plus conversation data if applicable, according to the retention policy.

### FR-06: User interface
- Provide upload, document list/detail, chat, citation, processing, empty, loading, and error states.
- Make upload progress and document readiness clear.
- Support responsive layouts and keyboard-accessible controls.
- Do not render PDF-derived text as trusted HTML.

### FR-07: Operations
- Provide health/readiness endpoints appropriate to the deployed architecture.
- Use structured logs and request/correlation IDs.
- Record ingestion failures and external provider failures without logging secrets or full document text.
- Support configuration through validated environment variables.

## 5. Non-functional requirements

- **Security:** authentication and authorization requirements must be resolved before exposing private documents to multiple users.
- **Privacy:** define file retention, deletion, provider data handling, and logging policy before launch.
- **Reliability:** ingestion operations should be retryable and idempotent.
- **Performance:** establish measurable upload, ingestion, and question-answer latency targets after choosing models and infrastructure.
- **Scalability:** do not require large PDF parsing or embedding jobs to block HTTP request handlers.
- **Maintainability:** strict TypeScript, modular boundaries, linting, type checks, and automated tests.
- **Accessibility:** keyboard support, visible focus, semantic labels, and readable contrast.
- **Observability:** logs and metrics for upload, processing, retrieval, model calls, and failures.

## 6. Out of scope for initial MVP unless approved

- OCR for scanned PDFs.
- Support for Word, images, and other file formats.
- Public sharing and collaborative workspaces.
- Web search or answering from sources outside the uploaded document.
- Complex autonomous agents and multi-step tool execution.
- Billing, subscriptions, and usage-based payments.

## 7. Acceptance criteria for the MVP

- A valid PDF can be uploaded and receives a stable document ID.
- Invalid or oversized uploads are rejected safely.
- Processing status transitions are visible and failures are actionable.
- A processed PDF can be queried.
- Answers include citations that map to retrieved source chunks/pages.
- The system acknowledges insufficient evidence instead of confidently fabricating an answer.
- A user cannot query or delete another user's documents.
- Retrying ingestion does not create duplicate vectors.
- Deleting a document triggers removal of its file and related vector records.
- Automated tests cover validation, ownership, ingestion, retrieval, citations, and error paths.
- Type checking, linting, and relevant tests pass in CI.

## 8. Decisions still required

- LLM provider and model: `TBD`.
- Embedding provider/model and vector dimensions: `TBD`.
- PDF parser and OCR policy: `TBD`.
- Original-file storage: `TBD` (local development storage vs object storage).
- Authentication provider and account model: `TBD`.
- Conversation persistence: `TBD`.
- Maximum PDF size/page count and usage/rate limits: `TBD`.
- Deployment target and background-job mechanism: `TBD`.
