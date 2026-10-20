# Architecture Decision Record (ADR) Log

Use this file to record meaningful decisions. For major decisions, include context, options considered, the chosen option, consequences, and the date.

## Status key

- `Proposed`: recommended but not approved.
- `Accepted`: approved and should be followed.
- `Superseded`: replaced by a newer decision.

## ADR-001: Frontend framework

- **Status:** Accepted
- **Decision:** Next.js + React + TypeScript.
- **Reason:** Matches the project's requested frontend stack.
- **Consequences:** Use Next.js routing and server/client component boundaries intentionally.

## ADR-002: Backend language and architecture

- **Status:** Proposed
- **Decision:** Node.js + TypeScript + Express, organized as MVC plus services and integration adapters.
- **Reason:** Keeps HTTP concerns, business rules, and provider integrations separate.
- **Needs confirmation:** Express was not explicitly named in the latest stack decision.

## ADR-003: Vector database

- **Status:** Accepted
- **Decision:** Qdrant for vector storage and similarity search.
- **Consequences:** Collection dimensions and distance metric depend on the selected embedding model. Original PDFs and application metadata should not automatically be stored only in Qdrant.

## ADR-004: Code quality guidance

- **Status:** Accepted
- **Decision:** Follow `node-backend-pattern` and `typescript-best-practices` as requested, after verifying the exact skill IDs installed in the coding agent.
- **Consequences:** Keep project-specific rules in `PRINCIPLES.md` and `AGENTS.md`; do not rely on skills alone.

## ADR-005: LLM provider

- **Status:** Proposed — TBD
- **Options to evaluate:** OpenAI, Gemini, a hosted open model, or a locally hosted model.
- **Decision criteria:** answer quality, latency, cost, privacy, SDK support, deployment constraints.

## ADR-006: Embedding model

- **Status:** Proposed — TBD
- **Decision criteria:** retrieval quality, language support, cost, latency, vector dimensions, provider compatibility.
- **Important:** changing models/dimensions may require a new Qdrant collection or a full re-index.

## ADR-007: Original PDF storage

- **Status:** Proposed — TBD
- **Options:** private object storage for deployed environments; local filesystem only for suitable local development.
- **Constraint:** do not use Qdrant as the primary binary file store.

## ADR-008: Metadata and conversation persistence

- **Status:** Proposed — TBD
- **Question:** Which durable store owns users, document lifecycle/status, conversations, and usage metadata?
- **Constraint:** Qdrant alone may not satisfy transactional lifecycle and relational querying requirements.

## ADR-009: Background processing

- **Status:** Proposed — TBD
- **Question:** Should PDF parsing and embedding run in a worker/queue?
- **Guidance:** Use background processing when document size, provider latency, retries, or request timeouts make synchronous processing unreliable. Choose queue technology only after the deployment model is known.

## Decision template

### ADR-XXX: Title

- **Date:**
- **Status:** Proposed / Accepted / Superseded
- **Context:**
- **Options considered:**
- **Decision:**
- **Consequences:**
