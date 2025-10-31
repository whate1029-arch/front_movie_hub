# Code Review Checklist

Use this checklist to conduct thorough and consistent code reviews. Tailor it to the specific project or team standards as needed.

## 1. Code Structure & Design
- [ ] Does the code follow the project's architectural patterns and design principles?
- [ ] Are modules, components, and functions organized logically with single, clear responsibilities?
- [ ] Is the code free of unnecessary duplication, and are common patterns abstracted appropriately?
- [ ] Are dependencies (internal and external) necessary, minimal, and properly managed?
- [ ] Are changes backward-compatible where required, and do they avoid breaking existing interfaces?

## 2. Readability & Maintainability
- [ ] Is the code easy to read and understand (e.g., meaningful names, appropriate comments, consistent formatting)?
- [ ] Are complex sections broken down into smaller, understandable units with clear intent?
- [ ] Are comments and TODOs relevant, concise, and up to date?
- [ ] Is dead or obsolete code removed rather than commented out?

## 3. Error Handling & Reliability
- [ ] Are errors detected and handled gracefully, with appropriate fallbacks or user messaging?
- [ ] Are edge cases, boundary conditions, and failure scenarios considered and tested?
- [ ] Are exceptions used appropriately and not swallowed silently?
- [ ] Are logging levels appropriate, avoiding both excessive noise and missing critical information?

## 4. Documentation & Communication
- [ ] Are public APIs, functions, and modules documented with clear purpose, inputs, outputs, and side effects?
- [ ] Are README, changelog, or other project documents updated when behavior or configuration changes?
- [ ] Do inline comments explain non-obvious logic or decisions?
- [ ] Are any migrations, deployment steps, or configuration changes documented for the operations team?

## 5. Testing & Quality Assurance
- [ ] Are automated tests (unit, integration, end-to-end) updated or added to cover new functionality and edge cases?
- [ ] Do tests pass locally or in the continuous integration pipeline?
- [ ] Is test coverage adequate, and are there gaps that should be addressed?
- [ ] Are test fixtures and mocks accurate, maintainable, and not overly brittle?

## 6. Performance & Scalability
- [ ] Are there potential bottlenecks or inefficiencies (e.g., unnecessary loops, repeated computations, large allocations)?
- [ ] Does the code handle expected load, data volumes, and concurrency requirements?
- [ ] Are resource-intensive operations optimized or deferred appropriately (e.g., caching, batching, lazy loading)?
- [ ] Are database queries and external service calls efficient and minimized?

## 7. Security & Privacy
- [ ] Are inputs validated, sanitized, and encoded to prevent injection or other vulnerabilities?
- [ ] Is sensitive data handled securely (e.g., encryption, secure storage, minimal exposure in logs)?
- [ ] Are authentication, authorization, and access control checks enforced consistently?
- [ ] Are dependencies reviewed for known vulnerabilities and kept up to date?
- [ ] Does the change comply with data privacy, compliance, and regulatory requirements?

## 8. Adherence to Coding Standards
- [ ] Does the code follow the team's style guides, linting rules, and formatting conventions?
- [ ] Are language- or framework-specific best practices observed?
- [ ] Are naming conventions for files, classes, functions, and variables consistent with project guidelines?
- [ ] Are linters, formatters, and static analysis tools configured and run as part of the change?

## 9. Deployment & Observability
- [ ] Are deployment scripts, infrastructure as code, or configuration files updated if required?
- [ ] Are monitoring, metrics, and alerting considerations addressed for new or changed behavior?
- [ ] Are feature flags or rollout strategies used where appropriate to mitigate risk?

## 10. Overall Assessment
- [ ] Does the change align with the associated requirements, design documents, or tickets?
- [ ] Have potential impacts on upstream/downstream systems or teams been communicated?
- [ ] Are there any unresolved questions, blockers, or follow-up tasks that need tracking?

Use this checklist as a guide, applying judgment to balance thoroughness with review efficiency.
