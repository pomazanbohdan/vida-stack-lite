---
instruction_id: write-the-spec-with-the-core-areas
title: Write the spec with the core areas
summary: "Cover the objective, the commands, the project structure, the code style, the testing strategy and the boundaries in every spec, and keep the format the project already uses."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: "A specification is written for a project, a feature or a significant change."
conditions_does_not_apply_when: "The change is a single-line fix, a typo correction, or a self-contained change whose requirements are unambiguous."
artifact_contract_output_type: specification
artifact_contract_required_data:
  - the objective
  - the commands
  - the project structure
  - the code style
  - the testing strategy
  - the boundaries
artifact_contract_verified_by: "the saved spec covers all six areas and the boundaries are split into always, ask first and never"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/spec-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - operations
---

# Write the spec with the core areas
Write a structured specification before writing any code. The spec is the shared source of truth between you and the human engineer — it defines what we're building, why, and how we'll know it's done. Code without a spec is guessing.

**Write a spec document covering these six core areas:**

1. **Objective** — What are we building and why? Who is the user? What does success look like?

2. **Commands** — Full executable commands with flags, not just tool names.
   ```
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

3. **Project Structure** — Where source code lives, where tests go, where docs belong.
   ```
   src/           → Application source code
   src/components → React components
   src/lib        → Shared utilities
   tests/         → Unit and integration tests
   e2e/           → End-to-end tests
   docs/          → Documentation
   ```

4. **Code Style** — One real code snippet showing your style beats three paragraphs describing it. Include naming conventions, formatting rules, and examples of good output.

5. **Testing Strategy** — What framework, where tests live, coverage expectations, which test levels for which concerns.

6. **Boundaries** — Three-tier system:
   - **Always do:** Run tests before commits, follow naming conventions, validate inputs
   - **Ask first:** Database schema changes, adding dependencies, changing CI config
   - **Never do:** Commit secrets, edit vendor directories, remove failing tests without approval

**Spec template:**

```markdown
# Spec: [Project/Feature Name]

## Objective
[What we're building and why. User stories or acceptance criteria.]

## Tech Stack
[Framework, language, key dependencies with versions]

## Commands
[Build, test, lint, dev — full commands]

## Project Structure
[Directory layout with descriptions]

## Code Style
[Example snippet + key conventions]

## Testing Strategy
[Framework, test locations, coverage requirements, test levels]

## Boundaries
- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria
[How we'll know this is done — specific, testable conditions]

## Open Questions
[Anything unresolved that needs human input]
```

**External spec tools:** This workflow is format-agnostic. If the project already uses another specification system, keep that system's artifact format and storage conventions instead of creating a duplicate spec file. This workflow owns the clarification, content, and approval gates; the external tool owns how the approved spec is represented.

## Red Flags

- Making architectural decisions without documenting them
- Skipping the spec because "it's obvious what to build"
