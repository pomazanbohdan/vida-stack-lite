---
instruction_id: bind-each-recommendation-to-the-decision-and-its-confidence
title: Bind each recommendation to the decision and its confidence
summary: "Every recommendation names the decision it serves, the artefact that will consume it and the confidence its basis carries, in the same sentence."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A recommendation is about to be written into a report.
conditions_does_not_apply_when: "The text is a finding, not a recommendation."
artifact_contract_output_type: recommendation-set
artifact_contract_required_data:
  - the decision served
  - the consuming artefact
  - the confidence basis
artifact_contract_verified_by: every recommendation names its confidence basis and flags a low-confidence or disputed basis in the same sentence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 1
---

# Bind each recommendation to the decision and its confidence
**Recommendations** — each bound to the decision and, where the project has them, to the downstream artifact that consumes it (per the pack’s `Feeds` entries: brief section, PRD input, architecture constraint). Each recommendation names its confidence basis; a recommendation resting on low-confidence or disputed claims says so in the same sentence.
