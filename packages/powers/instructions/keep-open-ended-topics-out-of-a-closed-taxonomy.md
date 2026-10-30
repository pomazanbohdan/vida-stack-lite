---
instruction_id: keep-open-ended-topics-out-of-a-closed-taxonomy
title: Keep open-ended topics out of a closed taxonomy
summary: "A closed taxonomy carries only the finite, project-independent cases; the open, domain-dependent ones stay prose."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A taxonomy of considerations is being built.
conditions_does_not_apply_when: The taxonomy is deliberately open-ended.
artifact_contract_output_type: taxonomy-boundary
artifact_contract_required_data:
  - the closed cases
  - the open cases that stay prose
  - the relevance filter
artifact_contract_verified_by: the open cases are not in the compiled taxonomy and the relevance filter was applied first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ui-consideration-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Keep open-ended topics out of a closed taxonomy
This compiled taxonomy covers ONLY the finite, project-independent shape-rooted content/robustness states
The **open**, domain/UX-dependent considerations — real-time/offline/optimistic-UI, deep accessibility (WCAG breadth), internationalization / RTL depth, and emerging interaction paradigms — are open-ended and are prose-owned
NOT here. Forcing them into a closed compiled taxonomy is the wrong model
Classify each element's kind(s), then raise only the categories whose `applies to element kinds` intersect. A static label is never asked about loading or empty state — that is what makes an unresolved consideration meaningful
Silence is not a resolution; the reason is the audit trail
