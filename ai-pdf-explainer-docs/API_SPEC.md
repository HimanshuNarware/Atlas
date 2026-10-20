# Initial API Contract

This is a proposed REST contract for discussion, not an implemented or final API. Prefix: `/api/v1`.

## Conventions

- JSON responses use a consistent shape.
- Upload requests use `multipart/form-data`.
- Document and conversation IDs are opaque identifiers.
- Validate all inputs on the server.
- Apply authentication/ownership checks to every private resource once auth is selected.
- Exact authentication mechanism and error codes are `TBD`.

## Proposed endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Basic liveness check |
| `GET` | `/ready` | Readiness check for required dependencies |
| `POST` | `/documents` | Upload a PDF and begin processing |
| `GET` | `/documents` | List documents available to the caller |
| `GET` | `/documents/:documentId` | Get metadata and processing status |
| `DELETE` | `/documents/:documentId` | Delete a document and associated data |
| `POST` | `/documents/:documentId/questions` | Ask a question about one document |
| `GET` | `/documents/:documentId/conversations` | List conversations, if persistence is enabled |
| `POST` | `/documents/:documentId/conversations` | Create a conversation, if supported |
| `POST` | `/conversations/:conversationId/messages` | Send a follow-up question, if supported |

## Example: upload

Request: `POST /api/v1/documents`, multipart field `file`.

Illustrative response:

```json
{
  "data": {
    "documentId": "opaque-id",
    "status": "uploaded",
    "filename": "guide.pdf"
  }
}
```

## Example: document status

```json
{
  "data": {
    "documentId": "opaque-id",
    "status": "processing",
    "pageCount": null,
    "chunkCount": null
  }
}
```

Possible statuses: `uploaded`, `processing`, `ready`, `failed`, `deleting`, `deleted`.

## Example: ask a question

Request:

```json
{
  "question": "What are the main points in chapter two?",
  "conversationId": "optional-opaque-id"
}
```

Illustrative response:

```json
{
  "data": {
    "answer": "The document identifies three main points...",
    "citations": [
      {
        "documentId": "opaque-id",
        "pageNumber": 7,
        "chunkId": "opaque-chunk-id",
        "excerpt": "A short supporting excerpt..."
      }
    ],
    "insufficientEvidence": false
  }
}
```

Citations must be generated from actual retrieved chunks; do not fabricate page numbers or excerpts.

## Error shape

```json
{
  "error": {
    "code": "DOCUMENT_NOT_READY",
    "message": "This document is not ready to query."
  },
  "requestId": "request-id"
}
```

Do not return stack traces, credentials, raw provider errors, internal prompts, or sensitive file paths.

## API decisions to finalize

- Authentication and authorization scheme.
- Maximum upload size/page count and accepted PDF variants.
- Whether question answering is synchronous or asynchronous/streamed.
- Conversation persistence and history semantics.
- Pagination and sorting conventions.
- Rate limits, quotas, and error-code catalog.
- Whether excerpts are returned to the browser and their maximum length.
