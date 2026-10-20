---
instruction_id: record-rejected-requests-in-a-kb
title: Record rejected requests in a knowledge base
summary: "Record a rejected enhancement as one file per concept, matched by concept similarity, with a durable reason and its prior requests."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: An enhancement is rejected as out of scope.
conditions_does_not_apply_when: "The request was rejected because it is already implemented, or it is a bug."
artifact_contract_output_type: rejection-record
artifact_contract_required_data:
  - concept
  - decision
  - reason
  - prior requests
artifact_contract_verified_by: a matching request is surfaced to the maintainer instead of re-litigated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/triage/OUT-OF-SCOPE.md
status: active
revision: 1
---

# Record rejected requests in a knowledge base
The out-of-scope directory in a repo stores persistent records of rejected feature requests. It serves two purposes:
1. **Institutional memory**: why a feature was rejected, so the reasoning isn't lost when the issue is closed
2. **Deduplication**: when a new issue comes in that matches a prior rejection, the skill can surface the previous decision instead of re-litigating it
One file per **concept**, not per issue. Multiple issues requesting the same thing are grouped under one file.
The reason should be substantive: not "we don't want this" but why. Good reasons reference:
- Project scope or philosophy ("This project focuses on X; theming is a downstream concern")
- Technical constraints ("Supporting this would require Y, which conflicts with our Z architecture")
- Strategic decisions ("We chose to use A instead of B because...")
The reason should be durable. Avoid referencing temporary circumstances ("we're too busy right now"); those aren't real rejections, they're deferrals.
Only write here when an **enhancement** (not a bug) is *rejected* as `wontfix`. Do **not** write here when something is closed as `wontfix` because it's **already implemented**. That's a built feature, not a rejected one; recording it would poison the dedup checks with false rejections. Instead, the closing comment points to where the feature already lives.
The flow:
1. Maintainer decides a feature request is out of scope
2. Check if a matching out-of-scope file already exists
3. If yes: append the new issue to the "Prior requests" list
4. If no: create a new file with the concept name, decision, reason, and first prior request
5. Post a comment on the issue explaining the decision and mentioning the out-of-scope file
6. Close the issue with the `wontfix` label
