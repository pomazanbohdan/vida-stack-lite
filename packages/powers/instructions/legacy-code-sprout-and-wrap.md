---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-sprout-and-wrap
title: Sprout or wrap new behavior when the host cannot be tested
summary: "Keep new behavior out of the untested mass, connect it through one legacy call site, and track sprout debt for later coverage."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: New behavior must be added to code that cannot be tested today.
conditions_does_not_apply_when: A host that can be covered by characterization tests.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: New behavior is tested in isolation and the legacy connection is one explicit call site with tracked debt.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L101-L122"
status: active
revision: 1
---

# Sprout or wrap new behavior when the host cannot be tested

When the affected area genuinely cannot be tested today, keep new behavior out of the untested mass: test fresh sprouted code and connect it through one legacy call site, or wrap old behavior with a new method/class. Use Sprout Method for one insertion point, Sprout Class when the host cannot be instantiated, Wrap Method for surrounding behavior, and Wrap Class for several call sites or a bloated class. Track sprout debt and cover the host on a later change; sprouting is tactical, not a permanent substitute for tests.
