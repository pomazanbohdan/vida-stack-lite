---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-architecture-references-reviewer-gate-md-bbe89a10-c01"
title: "bmad-method: skills/bmad-architecture/references/reviewer-gate.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-architecture/references/reviewer-gate.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-architecture/references/reviewer-gate.md\"}"
atom_ids:
  - apply-the-clear-fixes-and-surface-only-what-needs-the-user
  - run-the-reviewer-gate-as-independent-lenses
atom_count: 2
atoms: "[{\"atom_id\":\"apply-the-clear-fixes-and-surface-only-what-needs-the-user\",\"file_sha256\":\"edf70a3b0237bec0e98f4c52b0704c3c10ed5f005dda25be427d9961dabc2c98\",\"content_sha256\":\"36c416b55a6fd5b67129a5af2528feed1e096fe4ff3629efa913f8767f4c8ef7\",\"file_bytes\":2184,\"body_bytes\":730},{\"atom_id\":\"run-the-reviewer-gate-as-independent-lenses\",\"file_sha256\":\"a56741bd64b2b5eb63dd2a815337d176523f8201e48cc5c95642f71c08990279\",\"content_sha256\":\"dc1dbe42038ca3c43ce5fcdddffdf058b57efe124f5c6d86cbe78742796a0606\",\"file_bytes\":2352,\"body_bytes\":1092}]"
carrier_sha256: 013b455a8328e1971a83b8375a97d4708ce325eb8d12b9eed7281131c5fb955e
carrier_bytes: 4853
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-clear-fixes-and-surface-only-what-needs-the-user -->
---
instruction_id: apply-the-clear-fixes-and-surface-only-what-needs-the-user
title: Apply the clear fixes and surface only what needs the user
summary: "At your own gate, apply the clear fixes — and never dismiss what you cannot judge — and put only the rest in front of the user; under a validation run, report instead of changing."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A gate of independent lenses has produced findings about a finished artefact.
conditions_does_not_apply_when: The findings have not been gathered yet.
artifact_contract_output_type: gate-disposition
artifact_contract_required_data:
  - the clear fixes applied
  - the findings that need the user
  - the report
artifact_contract_verified_by: the clear fixes are applied and only the judgment calls reach the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/references/reviewer-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Apply the clear fixes and surface only what needs the user
This is your own gate — apply the clear fixes rather than handing over a list; surface only what genuinely needs the user.
Under a validation run,
fold every reviewer's output into one bespoke HTML + markdown report and open the HTML.
never auto-dismiss — a wrong dismissal is the exact silent failure being eliminated
it NEVER auto-`dismiss`es and never auto-resolves an unclassified item with backstop
The reason string is the audit trail; silence is not a valid dismissal.
A missing shape is not evidence an edge exists, so minting a held-out edge obligation on a requirement that may be genuinely edge-free would be a false claim and risks a vacuous edge test.
<!-- vpmodule:atom:end apply-the-clear-fixes-and-surface-only-what-needs-the-user -->
<!-- vpmodule:atom:begin run-the-reviewer-gate-as-independent-lenses -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/references/reviewer-gate.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the reviewer gate as independent lenses
settles the mechanical misses (placeholders, duplicate `AD` IDs, missing Binds/Prevents/Rule, unpinned Stack versions), so reviewers spend judgment on the semantic half.
If a ticket drove the run, the rubric walker also checks that the spine covers every requirement in that ticket.
Dispatch every entry as a **parallel subagent against the spine**
Each writes its full review to
a subfolder, so the gate's scratch stays out of the deliverable folder
and returns ONLY a compact summary (verdict, top 2–5 findings, file path) — the parent never holds full review text.
An inline self-check does not count: the independent context is the point, because a fresh reviewer finds the divergences the author talks past.
If subagents are unavailable, run sequentially — write the file first, then flush it from context.
Scale *whether and how heavily the gate runs* to the stakes
But once the gate runs, the `{workflow.finalize_reviewers}` always run — they are the configured floor, never cherry-picked out; only the ad-hoc lenses are optional.
<!-- vpmodule:atom:end run-the-reviewer-gate-as-independent-lenses -->