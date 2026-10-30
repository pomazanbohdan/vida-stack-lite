---
instruction_id: import-only-from-the-published-entry
title: Import only from the published entry
summary: "The public, versioned entry point is the contract; everything behind it is internal and may change, so it is never imported directly."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: Code outside a package imports from it.
conditions_does_not_apply_when: The code is inside the package and works on its own internals.
artifact_contract_output_type: import-surface
artifact_contract_required_data:
  - the published entry
  - the version it carries
artifact_contract_verified_by: every import goes through the published entry and no internal module is imported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/author-a-host-plugin.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Import only from the published entry
import only from it. Everything it re-exports is public and versioned
