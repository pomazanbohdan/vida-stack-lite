---
instruction_id: look-for-the-projects-that-abandoned-the-approach
title: Look for the projects that abandoned the approach
summary: "After the evidence for an approach is gathered, the projects that abandoned it are searched for and the negative evidence weighs more."
capability_tags:
  - research-primary-sources
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Evidence has been gathered for a recommended approach.
conditions_does_not_apply_when: The recommendation is a factual lookup with no alternatives.
artifact_contract_output_type: negative-evidence
artifact_contract_required_data:
  - the abandoned projects found
  - the weight given to the negative evidence
artifact_contract_verified_by: the search for abandonment evidence was run and reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Look for the projects that abandoned the approach
After gathering evidence FOR a recommended approach, actively search for projects that ABANDONED it. Check GitHub issues for "migrated away from", "replaced X with", or "problems with X at scale". A technology with 10 success stories and 100 quiet failures looks great until you check the graveyard. Weight negative evidence (migration-away stories, deprecation notices, unresolved issues) MORE heavily than positive evidence -- failures are underreported
