---
instruction_id: do-not-accept-deferred-cleanup
title: Do not accept deferred cleanup
summary: "Require the cleanup now, or a filed and self-assigned bug, instead of accepting a promise to do it later."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A change leaves a known problem behind with a promise to clean it up later.
conditions_does_not_apply_when: The problem is a genuine emergency that cannot be addressed now.
artifact_contract_output_type: cleanup-decision
artifact_contract_required_data:
  - the deferred problem
  - the decision to fix it now
  - the filed bug when it is deferred
artifact_contract_verified_by: no cleanup is left as a promise; anything deferred carries a filed bug with an owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not accept deferred cleanup

**Don't accept "I'll clean it up later."** Experience shows deferred cleanup rarely happens. Require cleanup before submission unless it's a genuine emergency. If surrounding issues can't be addressed in this change, require filing a bug with self-assignment.

"We'll clean it up later" | Later never comes. The review is the quality gate — use it. Require cleanup before merge, not after.

Accepting "I'll fix it later" — it never happens
