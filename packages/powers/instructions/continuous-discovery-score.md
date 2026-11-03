---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: continuous-discovery-score
title: Score the discovery practice
summary: "Score the seven diagnostic rows, report the current score, failing rows and a specific fix for each."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing whether a discovery practice is continuous and evidence-based.
conditions_does_not_apply_when: A narrow delivery review that does not assess discovery.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the current score, the failing rows and a specific fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/continuous-discovery/SKILL.md; sha256=44260b572a050417ba3733021eaa1694318fda80794c3e07800c66b4bc4a0c9e; locator=skills/continuous-discovery/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the discovery practice

Goal: 10/10. Score a discovery practice by the seven Quick Diagnostic rows below — start at 3, add 1 point per row answered "yes" (max 10). Bands: 9-10 = weekly cadence, a living Opportunity Solution Tree, systematic assumption testing, and every shipped feature traceable to a customer opportunity; 5-6 = some discovery happening but ad hoc, PM-only, or disconnected from delivery; ≤3 = intuition- and stakeholder-driven with no regular customer contact. Report the current score, the failing rows, and the specific fix for each.
