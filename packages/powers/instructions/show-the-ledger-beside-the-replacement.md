---
instruction_id: show-the-ledger-beside-the-replacement
title: Show the ledger beside the replacement
summary: "Present the whole new block together with the fate of every existing instruction, so the proposal shows what is lost as well as what is gained."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A replacement block of instructions is about to be written to a repository.
conditions_does_not_apply_when: The block is created for the first time and nothing exists to lose.
artifact_contract_output_type: proposal-with-ledger
artifact_contract_required_data:
  - the complete block
  - the ledger
  - the decisions
  - the itemised deletions
artifact_contract_verified_by: every existing instruction appears with its decision and its reason next to the replacement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
status: active
revision: 1
---

# Show the ledger beside the replacement
**Show the complete block before writing it**, and every child block alongside it — one approval covers the set.
**Present the settled ledger with it**: replacement text alone is an incomplete proposal, because it shows what the user gains and hides what they lose.
Every existing instruction appears with its decision and reason.
If a rewrite weakens, narrows, or drops part of a rule, treat the lost part as a deletion and list it separately.
Keep the rule itself; examples may explain it but cannot replace it.
Every relocation, automation, and deletion is itemized.
A deletion resting on none of the first three grounds is held for line-item approval — approving the block never approves it — and a declined deletion, relocation, or automation reverts to retain.
On approval, splice between the markers — the splice itself touches nothing outside them.
Text outside the markers changes only through a settled ledger entry or a proposed fix the user has seen, never as a side effect of the splice.
