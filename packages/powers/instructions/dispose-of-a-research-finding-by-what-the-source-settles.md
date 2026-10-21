---
instruction_id: dispose-of-a-research-finding-by-what-the-source-settles
title: Dispose of a research finding by what the source settles
summary: "A research finding is corrected when a source authoritative for that claim says otherwise, and put on the ledger when the source is not authoritative or the answer cannot be reached."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A research pass returned claims that have to be stated, corrected or held back."
conditions_does_not_apply_when: The claim comes from a source that was read directly and needs no disposition.
artifact_contract_output_type: claim-disposition
artifact_contract_required_data:
  - the claim
  - the source and whether it is authoritative for the claim
  - the disposition
artifact_contract_verified_by: every claim carries one disposition and every correction names its source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 1
---

# Dispose of a research finding by what the source settles
Refute vs abstain — the deciding question is what the source settles, not how surprising it is.
A primary source **for this claim's subject** states the opposite. The claim is simply wrong.
A source disagrees, but it is not authoritative for this claim (wrong version, adjacent subject, secondary/derivative), **or** two comparable sources disagree with each other.
"Strong prior" means your own pre-existing belief, which is never authoritative on its own — it can only ever produce an abstain, never a refute.
A finding returned with **no** `[admit:/refute:/abstain:]` tag is treated as an **abstain** and goes to the ledger with the reason
