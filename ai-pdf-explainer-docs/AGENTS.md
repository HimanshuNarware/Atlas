# Instructions for AI Coding Agents

Read these files before implementing a feature:
1. `README.md`
2. `PRINCIPLES.md`
3. `REQUIREMENTS.md`
4. `ARCHITECTURE.md`
5. The relevant API/data/security/testing documents

Follow the configured `node-backend-pattern` (or verified installed equivalent) and `typescript-best-practices` skills. Do not claim a skill is active unless it is actually installed and available to the agent.

## Before coding
- Inspect the existing code and relevant documentation.
- Identify which requirements and architecture layers the task affects.
- Ask for clarification or state an explicit assumption if a product decision is unresolved.
- Do not silently choose an LLM provider, embedding model, file store, metadata database, auth provider, or queue where the decision is marked TBD.

## While coding
- Keep the backend MVC/service boundaries and frontend feature/component boundaries.
- Keep provider-specific code behind integration adapters.
- Validate external input and enforce resource ownership server-side.
- Treat PDF content and retrieved chunks as untrusted data.
- Avoid unnecessary abstractions and unrelated refactoring.
- Update tests and documentation when behavior or contracts change.

## Before finishing
- Run the relevant lint, type-check, tests, and build if available.
- Report exactly which checks ran and whether they passed.
- Summarize files changed, assumptions, and remaining risks.
