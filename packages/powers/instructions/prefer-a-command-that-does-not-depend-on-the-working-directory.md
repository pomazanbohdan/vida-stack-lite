---
instruction_id: prefer-a-command-that-does-not-depend-on-the-working-directory
title: Prefer a command that does not depend on the working directory
summary: A command written as a relative climb resolves differently in a worktree; the prefix form resolves the same everywhere.
capability_tags:
  - plan-implementation
pattern_tags:
  - project-conventions-first
conditions_applies_when: A verify command targets a directory other than the current one.
conditions_does_not_apply_when: The command runs only from the repository root.
artifact_contract_output_type: cwd-independent-command
artifact_contract_required_data:
  - the target directory
  - the command form used
artifact_contract_verified_by: the command resolves the same way from any working directory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer a command that does not depend on the working directory
| `cd <dir> && npm run <script>` | Depends on the executor's cwd; a relative climb resolves differently inside a worktree |
| `npm --prefix <dir> run <script>` | Independent of cwd — **prefer this** |
