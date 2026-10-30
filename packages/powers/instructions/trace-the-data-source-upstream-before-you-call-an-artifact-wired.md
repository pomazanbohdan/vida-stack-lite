---
instruction_id: trace-the-data-source-upstream-before-you-call-an-artifact-wired
title: Trace the data source upstream before you call an artifact wired
summary: "An artefact that is wired but whose source returns nothing is hollow, so the source is traced upstream."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: "An artefact passed the existence, substance and wiring levels and renders dynamic data."
conditions_does_not_apply_when: The artefact is a utility or a configuration.
artifact_contract_output_type: data-flow-status
artifact_contract_required_data:
  - the data source
  - the data-flow status
  - the final artefact status
artifact_contract_verified_by: the upstream source was traced and the artefact status reflects the data flow
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-wiring-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Trace the data source upstream before you call an artifact wired
Artifacts that pass Levels 1-3 (exist, substantive, wired) can still be hollow if their data source produces empty or hardcoded values. Level 4 traces upstream from the artifact to verify real data flows through the wiring
For each artifact that passes Level 3 (WIRED) and renders dynamic data (components, pages, dashboards — not utilities or configs)
FLOWING
STATIC
DISCONNECTED
HOLLOW_PROP
