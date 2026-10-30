---
instruction_id: identify-the-exact-stack-and-versions
title: Identify the exact stack and versions
summary: "Read the dependency file, state the exact framework and version found, and ask when the version is missing or ambiguous."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: Framework-specific code is about to be written or reviewed.
conditions_does_not_apply_when: "Correctness does not depend on a specific version, such as renaming a variable, fixing a typo or moving a file."
artifact_contract_output_type: stack-detection
artifact_contract_required_data:
  - the dependency file read
  - the detected framework and version
  - the question asked when the version is unclear
artifact_contract_verified_by: the exact versions are stated before the implementation starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/source-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Identify the exact stack and versions

### Step 1: Detect Stack and Versions

Read the project's dependency file to identify exact versions:

`package.json`    → Node/React/Vue/Angular/Svelte
`composer.json`   → PHP/Symfony/Laravel
`requirements.txt` / `pyproject.toml` → Python/Django/Flask
`go.mod`          → Go
`Cargo.toml`      → Rust
`Gemfile`         → Ruby/Rails

State what you found explicitly:

STACK DETECTED:
- React 19.1.0 (from package.json)
- Vite 6.2.0
- Tailwind CSS 4.0.3
→ Fetching official docs for the relevant patterns.

If versions are missing or ambiguous, **ask the user**. Don't guess — the version determines which patterns are correct.

## Red Flags

- Not reading `package.json` / dependency files before implementing
- Implementing a pattern without knowing which version it applies to
