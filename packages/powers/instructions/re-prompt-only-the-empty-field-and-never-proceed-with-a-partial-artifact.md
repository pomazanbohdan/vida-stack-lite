---
instruction_id: re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact
title: Re-prompt only the empty field and never proceed with a partial artifact
summary: "An empty answer is re-prompted on its own; the run continues, it does not abort, and no half-filled artefact is ever carried forward."
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: An elicited artefact is assembled from several answers.
conditions_does_not_apply_when: The artefact comes from a document and no question is asked.
artifact_contract_output_type: field-reprompt
artifact_contract_required_data:
  - the field that was empty
  - the re-asked answer
  - the rebuilt artefact
artifact_contract_verified_by: the run continues after the re-prompt and the artefact is complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 1
---

# Re-prompt only the empty field and never proceed with a partial artifact
Empty or whitespace-only.
error and re-prompt that single field.
Do not proceed with a partial story.
Do not abort the workflow on first invalid draft.
Re-prompt the offending field(s) per surfaced errors, then re-run validation.
