# Security and Privacy Requirements

## Threat model

The application accepts user-supplied PDFs and sends text to embedding and language-model providers. Treat uploaded files, extracted text, retrieved chunks, user questions, and provider responses as untrusted inputs.

## Required controls

### Upload safety
- Enforce maximum byte size and page count.
- Check PDF signature/content, not only extension or MIME type.
- Generate storage keys; prevent path traversal.
- Reject malformed/encrypted files unless explicitly supported.
- Consider malware scanning before production use.
- Parse PDFs with resource/time limits to reduce denial-of-service risk.
- Keep uploaded files private by default.

### Authorization and isolation
- Authenticate users if documents are private.
- Check ownership/tenant access on every read, question, and delete operation.
- Apply ownership/document filters in Qdrant retrieval.
- Never trust a document ID supplied by the client as proof of permission.
- Test cross-user access denial explicitly.

### Prompt injection and RAG
- Treat PDF text as untrusted reference data, never as instructions that can override system policy.
- Instruct the LLM to answer using retrieved evidence and to say when evidence is insufficient.
- Do not let retrieved content trigger arbitrary tools or privileged actions.
- Validate output structure and citation references before returning them.
- Remember that prompt instructions alone are not a complete security boundary.

### Secrets and dependencies
- Keep LLM, embedding, storage, and Qdrant credentials on the server.
- Validate environment variables at startup.
- Commit `.env.example`, never real `.env` secrets.
- Rotate credentials and use least-privilege access.
- Keep dependencies updated and review new packages.

### API and operations
- Apply request size limits, rate limits, and usage quotas.
- Use safe error responses and centralized error handling.
- Protect against injection, cross-site scripting, CSRF where applicable, and unsafe file rendering.
- Use HTTPS in deployed environments.
- Avoid logging full PDF text, secrets, tokens, or sensitive questions by default.
- Configure CORS narrowly.
- Add timeouts for external services.

## Privacy decisions required before launch

- File and conversation retention periods.
- Deletion behavior for original files, Qdrant points, metadata, logs, and backups.
- Whether PDF text/questions are sent to third-party model providers.
- Provider data retention/training terms and applicable user disclosures.
- Data residency requirements, if any.
- User export and account deletion behavior.

## Security acceptance checks

- User A cannot read, query, or delete User B's document.
- Invalid/oversized uploads are rejected.
- Secrets never appear in browser bundles or API responses.
- Error responses do not reveal stack traces or internal paths.
- Document text is treated as untrusted data.
- Deletion cleans up vectors and stored files, including retry handling for partial failures.
