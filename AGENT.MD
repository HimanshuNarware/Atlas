# Code Quality and Architecture Rules

## Core principles
- Write readable, maintainable, production-quality code.
- Prefer simple, explicit solutions over clever abstractions.
- Follow the existing project conventions before introducing new patterns.
- Avoid overengineering, unnecessary dependencies, and duplicate code.
- Preserve existing business logic unless a change is explicitly required.

## Architecture
- Use MVC with a service layer for the Express backend.
- Keep routes, controllers, services, repositories, models, validators, and middleware separate.
- Controllers must remain thin and focus on HTTP request and response handling.
- Put business rules in services.
- Put reusable database queries in repositories when the abstraction is justified.
- Keep Mongoose schemas and model-level behavior in models.
- Validate all external input at the application boundary.
- Centralize error handling and environment configuration.

## Code readability
- Use descriptive names that explain intent.
- Keep functions focused on one responsibility.
- Avoid deeply nested conditionals and unnecessary boolean flags.
- Prefer early returns when they improve clarity.
- Avoid duplicated business logic and unexplained magic values.
- Add comments to explain why something is necessary, not merely what the code does.
- Use explicit types and avoid `any` in TypeScript unless justified.

## React
- Keep components focused on one responsibility.
- Separate reusable UI from business logic where appropriate.
- Avoid unnecessary useEffect hooks and duplicated state.
- Keep API communication and error handling consistent.
- Follow the existing state management and data-fetching conventions.

## Before finishing a change
- Inspect related files and existing patterns first.
- Avoid unrelated refactoring.
- Run relevant tests, linting, and type checks when available.
- Review error handling, security, edge cases, and naming.
- Summarize the changes and mention any checks that could not be run.