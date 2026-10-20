---
instruction_id: resolve-a-named-item-through-the-resolver
title: Resolve a named item through the resolver
summary: "An item the user names is found through the tool's own lookup before anything is done to it, and the item is read before it is changed."
capability_tags:
  - plan-implementation
pattern_tags:
  - evidence-analysis
conditions_applies_when: The user names a work item and it has to be found.
conditions_does_not_apply_when: The item is already in hand.
artifact_contract_output_type: resolved-item
artifact_contract_required_data:
  - the reference the user gave
  - the item it resolved to
  - the question asked when more than one fits
artifact_contract_verified_by: "the item was resolved by the tool's own lookup and read before it was acted on"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 1
---

# Resolve a named item through the resolver
A ticket the user names — "refine 1.2", "start ABCD-13", "build the cart service scaffold" — resolves through `tickets.py find [<folder>] <ref>` before you pull, review, refine, start, or mark it.
When the user's words are looser than that, read `status` and pick the ticket yourself, asking when more than one fits.
Read an existing ticket before changing it; if it has been published to a tracker, query its current remote state too.
