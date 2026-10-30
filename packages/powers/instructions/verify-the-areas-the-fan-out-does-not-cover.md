---
instruction_id: verify-the-areas-the-fan-out-does-not-cover
title: Verify the areas the fan-out does not cover
summary: "Accessibility, infrastructure and documentation are not covered by the delegated checks, so the main agent verifies them directly."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Checks were delegated to specialists and some areas were not delegated.
conditions_does_not_apply_when: Every area was covered by a delegated check.
artifact_contract_output_type: coverage-gap-check
artifact_contract_required_data:
  - the areas the specialists do not cover
  - the direct check for each
artifact_contract_verified_by: "accessibility, infrastructure and documentation are each checked directly"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
  - operations
---

# Verify the areas the fan-out does not cover
4. **Accessibility** — Verify keyboard nav, screen reader support, contrast (not covered by the three personas — handle directly here, or invoke the accessibility checklist).
5. **Infrastructure** — Env vars, migrations, monitoring, feature flags. Verify directly.
6. **Documentation** — README, ADRs, changelog. Verify directly.
