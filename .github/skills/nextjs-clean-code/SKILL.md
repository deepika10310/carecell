---
name: nextjs-clean-code
description: "Use when creating, refactoring, reviewing, or debugging Next.js code with clean-code principles. Covers App Router and Pages Router, React components, server/client boundaries, data fetching, route handlers, accessibility, testing, and maintainable architecture."
argument-hint: "Describe the Next.js feature, file, or code to create, refactor, review, or debug."
---

# Next.js Clean Code

Apply clean-code principles while preserving the conventions and behavior of the existing Next.js project. Prefer simple, idiomatic solutions over unnecessary abstractions.

## Workflow

1. **Clarify the change from context.** Identify the requested behavior, constraints, acceptance criteria, and affected routes or components. Ask a concise question only when a missing requirement blocks a safe implementation; otherwise state reasonable assumptions and proceed.
2. **Inspect the project before editing.** Check the package scripts, installed Next.js and React versions, directory structure, router style (App Router or Pages Router), TypeScript settings, lint/test conventions, and nearby examples. Follow existing conventions rather than imposing a new architecture. Do not mix router paradigms within an existing feature.
3. **Map responsibilities and boundaries.** Identify what belongs in a page/layout, reusable UI component, server-only module, client component, route handler, or shared utility. Keep server components as the default in the App Router; add `'use client'` only where browser APIs, state, effects, or event handlers require it. Keep secrets and privileged data access on the server.
4. **Design the smallest clear change.** Use descriptive names, focused functions and components, explicit data flow, and early returns where they improve readability. Separate concerns when that reduces complexity, but avoid speculative generalization, needless wrappers, duplicate state, and one-use abstractions without a clear benefit. Keep types precise; avoid `any` and unsafe assertions unless justified.
5. **Implement idiomatically for the detected router and version.** Respect the project's established conventions for navigation, loading/error/not-found UI, metadata, forms, data fetching, caching/revalidation, and API endpoints. Avoid obsolete APIs or patterns when the installed Next.js version provides a current alternative. Validate untrusted input at system boundaries and handle expected failures explicitly.
6. **Preserve user-facing quality.** Maintain semantic HTML, keyboard accessibility, useful labels, and clear loading, empty, success, and error states where relevant. Avoid exposing sensitive information in client bundles, URLs, logs, or error messages.
7. **Verify the change.** When behavior changes, add or update relevant tests using the project's existing test framework and conventions. Run the narrowest relevant tests and project checks available (such as typecheck, lint, unit tests, or build). Review the final diff for behavior regressions, unused code, accidental client-boundary expansion, duplicated logic, and style inconsistencies. Fix issues introduced by the change; report any pre-existing or environment-blocked checks accurately.

## Clean-code review checklist

- Does each component/function have one clear responsibility and a useful name?
- Is the simplest readable implementation used, without avoidable duplication or premature abstraction?
- Are state, props, and data transformations explicit and minimal?
- Are server/client and trusted/untrusted boundaries correct?
- Are errors and edge states handled intentionally?
- Are accessibility and security considered for the changed behavior?
- Do types and tests cover the important contract and edge cases?
- Do validation commands pass, or are remaining failures clearly identified?
