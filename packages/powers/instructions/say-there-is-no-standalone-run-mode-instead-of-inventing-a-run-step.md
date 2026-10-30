---
instruction_id: say-there-is-no-standalone-run-mode-instead-of-inventing-a-run-step
title: Say there is no standalone run mode instead of inventing a run step
summary: "A target that cannot be started from the repository says so, and the fallback runs through test, then build, then the explicit statement."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A document has to tell the reader how to run the project.
conditions_does_not_apply_when: The project has a normal entry point.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the run path
  - the fallback used
artifact_contract_verified_by: no fabricated run step or output appears and the fallback order was followed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Say there is no standalone run mode instead of inventing a run step
Not every target can be run locally. When a project or package has no runnable entry point (event-triggered handlers with no CLI or HTTP surface) or cannot start from repository contents alone (required config comes from a secrets manager or deploy-time environment), do NOT write a literal run step or fabricated usage output.
Fall back in this order: the test command, then the build command, then an explicit "no standalone run mode" statement.
Targets with a normal entry point (`scripts.start`, a CLI bin, `go run`, `docker compose up`) keep the normal run step.
