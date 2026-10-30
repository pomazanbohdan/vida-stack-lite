---
instruction_id: label-the-human-annotation-as-an-annotation
title: Label the human annotation as an annotation
summary: A ticked box carries no machine authority; when it is shown it is labelled as an annotation and the status still comes from the recorded state.
capability_tags:
  - communicate-concisely
pattern_tags:
  - evidence-analysis
conditions_applies_when: A human-entered marker is rendered next to the recorded state.
conditions_does_not_apply_when: Every value shown comes from the recorded state.
artifact_contract_output_type: labelled-state
artifact_contract_required_data:
  - the annotation
  - the recorded state it is shown next to
artifact_contract_verified_by: the annotation is labelled as an annotation and the status is read from the recorded state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Label the human annotation as an annotation
`roadmap_acceptance` carries `authoritative: false`, and it means it. A ticked checkbox is a human annotation with no machine authority — completion comes from disk state. If you show the checkbox, label it as an annotation, not as status.
