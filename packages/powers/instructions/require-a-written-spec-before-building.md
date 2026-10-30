---
instruction_id: require-a-written-spec-before-building
title: Require a written spec before building
summary: A build starts only from a spec file at a known path; a README is not a spec and requirements are never invented.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A build is about to start and the requirements live in a document.
conditions_does_not_apply_when: "The work is a change with no spec to write, such as a fix that already has a failing test."
artifact_contract_output_type: spec-gate
artifact_contract_required_data:
  - the path the spec was looked for at
  - the spec that was found
  - the reason the build may continue
artifact_contract_verified_by: the build starts from a spec file that exists at a known path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/build.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Require a written spec before building
Require a spec.
Look only for a spec at a known path: `SPEC.md` at the repo root, `docs/SPEC.md`, or a file under `spec/`.
A README or arbitrary doc does **not** count.
If none exists, stop and tell the user to run
the spec step first.
Do not invent requirements.
