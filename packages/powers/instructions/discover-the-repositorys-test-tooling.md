---
instruction_id: discover-the-repositorys-test-tooling
title: "Discover the repository's test tooling"
summary: "Find the build system, the checked-in wrappers, the test framework, the conventions and the documented commands before the first test, and use those commands; for end-to-end work, also find the runner, the layout, the app start, the authentication and the CI job of that harness."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: The first test of a repository is about to be written and the local test commands or the end-to-end harness are unknown.
conditions_does_not_apply_when: "The repository's test commands are already known and were used recently."
artifact_contract_output_type: tooling-discovery
artifact_contract_required_data:
  - the dependency file
  - the focused-test command
  - the full-suite command
  - the test conventions
  - "the end-to-end harness: runner, layout, app start, authentication, CI job"
artifact_contract_verified_by: "the focused and the full-suite command come from the repository, not from a default, and the end-to-end runner, layout, app start and CI job come from the repository too"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Discover the repository's test tooling

## Discover the Stack First

The TDD cycle is universal; the commands are not. Before writing the first test, discover how *this* repository tests, and use its commands for every RED, GREEN, and verification step:

- **Language and build system** — `package.json`, `pom.xml`/`build.gradle`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, a `Makefile`
- **Checked-in wrappers** — prefer `./gradlew`, `./mvnw`, `make test`, or a repo script over globally installed tools
- **Test framework and configuration** — and how it runs a single focused test vs the full suite
- **Existing conventions** — where tests live, how files are named, what patterns neighboring tests follow
- **Documented commands** — README, CONTRIBUTING, and CI workflows show the commands that actually gate merges

Run the repository's focused-test command during the loop and its full-suite command before completion. Never assume a default like `npm test` — a Gradle, Cargo, or pytest project has its own equivalent.

## End-to-end and API tests

Read how this project already tests end to end before writing anything: the runner and its config, where end-to-end and API tests live and how they are named, how the app is started for a test run (dev server, containers, test database, fixtures and seeding), how tests authenticate, and the CI job that runs them. Look at whatever the project's ecosystem uses to declare dependencies and tasks, not only `package.json`.

## Red Flags

- Reaching for a default test command (`npm test`) without checking what this repository actually uses
