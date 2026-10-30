---
instruction_id: run-the-reviewer-gate-as-independent-lenses
title: Run the reviewer gate as independent lenses
summary: "Settle the mechanical misses first, then dispatch every configured lens as a parallel subagent whose full review lands in a file and whose reply stays a short summary."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - parallel-execution
conditions_applies_when: A finished artefact goes through a pre-handoff gate made of several independent lenses.
conditions_does_not_apply_when: "One reviewer, or a mechanical check with no semantic half."
artifact_contract_output_type: gate-run
artifact_contract_required_data:
  - the mechanical pass
  - the lenses that ran
  - the review files
  - the summaries
  - the skipped lenses
artifact_contract_verified_by: every configured lens ran as an independent context and the parent holds only summaries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/references/reviewer-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the reviewer gate as independent lenses
settles the mechanical misses (placeholders, duplicate `AD` IDs, missing Binds/Prevents/Rule, unpinned Stack versions), so reviewers spend judgment on the semantic half.
Dispatch every entry as a **parallel subagent against the spine**
Each writes its full review to
a subfolder, so the gate's scratch stays out of the deliverable folder
and returns ONLY a compact summary (verdict, top 2–5 findings, file path) — the parent never holds full review text.
An inline self-check does not count: the independent context is the point, because a fresh reviewer finds the divergences the author talks past.
If subagents are unavailable, run sequentially — write the file first, then flush it from context.
Scale *whether and how heavily the gate runs* to the stakes
But once the gate runs, the `{workflow.finalize_reviewers}` always run — they are the configured floor, never cherry-picked out; only the ad-hoc lenses are optional.
