---
instruction_id: print-the-provenance-of-the-resolved-setting
title: Print the provenance of the resolved setting
summary: "The run names the rule, the config value or the flag that produced the effective setting."
capability_tags:
  - review-code
pattern_tags:
  - decision-trail
conditions_applies_when: A setting is resolved from several sources.
conditions_does_not_apply_when: The setting has a single source.
artifact_contract_output_type: resolved-setting-provenance
artifact_contract_required_data:
  - the resolved value
  - the source it came from
artifact_contract_verified_by: one line names the resolved value and the source it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Print the provenance of the resolved setting
Every review prints one line naming the resolved depth and why:
| `matched rule N: <path>` | Rule at index `N` (0-based, in declaration order) matched on prefix `<path>` and set the depth. |
| `from workflow.code_review_depth` | No rule matched this review's file set; the global config value was used. |
