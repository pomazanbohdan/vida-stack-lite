---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-retrospective-references-aggregate-views-md-c74f9272-c01"
title: "bmad-method: skills/bmad-retrospective/references/aggregate-views.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-retrospective/references/aggregate-views.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-retrospective/references/aggregate-views.md\"}"
atom_ids:
  - delegate-the-derivation-without-delegating-the-verdict
  - derive-the-aggregate-views-from-the-whole-change
  - derive-the-architecture-delta-from-the-range
  - find-the-pattern-divergence-from-the-surrounding-code
  - map-the-duplication-across-the-change
  - rank-the-files-by-churn-and-then-read-them
  - reconcile-the-as-built-with-the-spec
atom_count: 7
atoms: "[{\"atom_id\":\"delegate-the-derivation-without-delegating-the-verdict\",\"file_sha256\":\"1ddff89497decd8da905c8467ea0163e5024e56af833d7a3f4e817ab9eb5fe74\",\"content_sha256\":\"640e9c8a55c34b9f79cb357e71206759f4f19ac39ee77c9b8fa22e751ee55280\",\"file_bytes\":1722,\"body_bytes\":455},{\"atom_id\":\"derive-the-aggregate-views-from-the-whole-change\",\"file_sha256\":\"5dcae1fa265d94dc648c8b3cca2281df3215345ba8b341680e99b30b7be63ed9\",\"content_sha256\":\"94999f07768623631f53fb914ca446b1287e5f17b04530abcd722383297e17f1\",\"file_bytes\":1753,\"body_bytes\":510},{\"atom_id\":\"derive-the-architecture-delta-from-the-range\",\"file_sha256\":\"843d75d28541aa795298b2cdf06f857ba31396cc62b9fa076a27aee7da4cf772\",\"content_sha256\":\"3109cb70c010a626cc837aba6a4b88ee760088d2529c49c5fe05805ce0bdcf18\",\"file_bytes\":1717,\"body_bytes\":514},{\"atom_id\":\"find-the-pattern-divergence-from-the-surrounding-code\",\"file_sha256\":\"363c6fc8e678b1830d87d7f84b3512107b7a1d320bb8bfbc88e4f031092bae6a\",\"content_sha256\":\"bb1cdfafbbd09510a4d5bab7f8b62f6f16a63814769ad5dc6c27033828da44f0\",\"file_bytes\":1452,\"body_bytes\":320},{\"atom_id\":\"map-the-duplication-across-the-change\",\"file_sha256\":\"3d131fc0fcab6d5b0a23a303c41effea4cdf05d2e6d5a54e4554168366339122\",\"content_sha256\":\"c0465d8d9ebbf253e9ad3bdc3d8d753630df79090f49c55e21cb7017908dbdb3\",\"file_bytes\":1335,\"body_bytes\":264},{\"atom_id\":\"rank-the-files-by-churn-and-then-read-them\",\"file_sha256\":\"579bff02b67f3be56dec249295879d2db4cfdcaa975ef07dcfb21f8378779655\",\"content_sha256\":\"caf9e5aa4dc036c65d260813ec36b310c3d7a7ccdef1b8ddeda1f0c5e2677aef\",\"file_bytes\":2708,\"body_bytes\":1503},{\"atom_id\":\"reconcile-the-as-built-with-the-spec\",\"file_sha256\":\"213fccfcffbf9e68186cf79d08d875415fd9dfbb7a4ae25d860f9b25ccb40786\",\"content_sha256\":\"a87e49eaf103ddb258519ed84420d0d7d977cdf6e6722077c60c91b8dc63c257\",\"file_bytes\":2649,\"body_bytes\":1208}]"
carrier_sha256: e8a62c04dec78a7c16d839dbd433de3c7cd7e69c25eff8157858d299c4fa1c97
carrier_bytes: 14369
revision: 1
status: active
---
<!-- vpmodule:atom:begin delegate-the-derivation-without-delegating-the-verdict -->
---
instruction_id: delegate-the-derivation-without-delegating-the-verdict
title: Delegate the derivation without delegating the verdict
summary: "A delegated view returns evidence and a checked scope, never a verdict; the parent consolidates and decides, and when delegation is impossible the highest-value views are computed inline and the narrowing is recorded."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
conditions_applies_when: Several aggregate views are to be derived.
conditions_does_not_apply_when: Only one view is derived.
artifact_contract_output_type: delegated-derivation
artifact_contract_required_data:
  - the narrow view each delegate got
  - the evidence each returned
  - the views that were narrowed or skipped
artifact_contract_verified_by: "no delegate returned a verdict, and the views that were skipped or narrowed are recorded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Delegate the derivation without delegating the verdict
When sub-agents are available, delegate the derivation: each returns evidence with source refs and checked scope, never a verdict — the parent consolidates and decides.
Give each a narrow view and an explicit return format.
When sub-agents are unavailable, compute the highest-value views inline (architecture delta and spec reconciliation first) and record which views were narrowed or skipped.
<!-- vpmodule:atom:end delegate-the-derivation-without-delegating-the-verdict -->
<!-- vpmodule:atom:begin derive-the-aggregate-views-from-the-whole-change -->
---
instruction_id: derive-the-aggregate-views-from-the-whole-change
title: Derive the aggregate views from the whole change
summary: "The views of the whole change find the defects that no single session and no single diff hunk could see, and a view is measured by a script rather than by an impression."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work that spans several sessions is read back.
conditions_does_not_apply_when: The change is small enough that a single session saw all of it.
artifact_contract_output_type: aggregate-views
artifact_contract_required_data:
  - the views that were derived
  - the evidence each view rests on
  - the views that were narrowed
artifact_contract_verified_by: "every view that became a finding carries a source reference, and a view computed by hand records its narrowed scope"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Derive the aggregate views from the whole change
An epic is many coding sessions, each validated in isolation; the defects that matter are the ones no single session — and no single diff hunk — could see.
Prefer deterministic derivation: a script that measures the codebase is evidence; a model's impression is not.
Where you compute a view inline instead of by script, record the narrowed scope.
Every observation that becomes a finding carries a source reference — the file, the symbol, the commits.
<!-- vpmodule:atom:end derive-the-aggregate-views-from-the-whole-change -->
<!-- vpmodule:atom:begin derive-the-architecture-delta-from-the-range -->
---
instruction_id: derive-the-architecture-delta-from-the-range
title: Derive the architecture delta from the range
summary: "The dependency structure is measured before and after the range and the graphs are compared, so the new cross-cutting dependencies, the layering violations and the cycles are seen."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The architecture of a body of work is read back.
conditions_does_not_apply_when: The change did not move anything between the modules.
artifact_contract_output_type: architecture-delta
artifact_contract_required_data:
  - the graph before
  - the graph after
  - "the new dependencies, violations and cycles"
artifact_contract_verified_by: the delta is derived from a measured graph and every new structure is named with the file it appears in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the architecture delta from the range
**Architecture delta** — how the dependency structure changed across the epic.
Where a language-native dependency tool exists (dependency-cruiser, madge, pydeps, and the like), run it before and after the range and diff the graphs; otherwise derive the module/import graph from the changed files.
Look for new cross-cutting dependencies, layering violations, and cycles introduced — structure the code's own conventions would forbid but no single ticket tripped.
<!-- vpmodule:atom:end derive-the-architecture-delta-from-the-range -->
<!-- vpmodule:atom:begin find-the-pattern-divergence-from-the-surrounding-code -->
---
instruction_id: find-the-pattern-divergence-from-the-surrounding-code
title: Find the pattern divergence from the surrounding code
summary: "The conventions of the surrounding codebase are the yardstick, and the divergence from them is found because it compounds over the sessions."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work is read back against the codebase it lives in.
conditions_does_not_apply_when: The codebase has no established convention to diverge from.
artifact_contract_output_type: pattern-divergence
artifact_contract_required_data:
  - the convention
  - the places that diverge from it
artifact_contract_verified_by: every divergence names the convention it breaks and the place it occurs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Find the pattern divergence from the surrounding code
**Pattern divergence** — where the epic's code diverges from the conventions the surrounding codebase already established: naming, error handling, test structure, module boundaries.
Agents learn conventions by pattern-matching the code, so divergence compounds.
<!-- vpmodule:atom:end find-the-pattern-divergence-from-the-surrounding-code -->
<!-- vpmodule:atom:begin map-the-duplication-across-the-change -->
---
instruction_id: map-the-duplication-across-the-change
title: Map the duplication across the change
summary: "The same problem solved more than one way across the pieces of work is mapped, because two sessions rarely know what the other one wrote."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work that spans several sessions is read back.
conditions_does_not_apply_when: The change came from one session.
artifact_contract_output_type: duplication-map
artifact_contract_required_data:
  - the places the same problem is solved twice
  - the places that exist twice
artifact_contract_verified_by: every duplicate is named with the places it appears in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Map the duplication across the change
**Duplication map** — the same problem solved more than one way across tickets.
Two sessions independently writing near-identical logic, or a helper reimplemented because the second session did not know the first existed.
<!-- vpmodule:atom:end map-the-duplication-across-the-change -->
<!-- vpmodule:atom:begin rank-the-files-by-churn-and-then-read-them -->
---
instruction_id: rank-the-files-by-churn-and-then-read-them
title: Rank the files by churn and then read them
summary: "The files are ranked by measured change volume, and the top of the ranking is read before anything is called a god-class; the qualifiers say how far the ranking can be trusted."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The size growth of the files of a body of work is judged.
conditions_does_not_apply_when: The change touched a handful of files.
artifact_contract_output_type: size-growth
artifact_contract_required_data:
  - the ranking by measured change volume
  - the real size of the files at the top
  - the qualifiers on the ranking
artifact_contract_verified_by: "no file is called a god-class on churn alone, and the unmeasured churn is reported as a qualifier"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Rank the files by churn and then read them
**God-class / size growth** — files that grew past a healthy size *over the epic*, invisible per-commit because each session added only a little.
The pre-pass
reports `added` / `deleted` / `net` per path in `files` — *change volume*, not a file's absolute size or a per-commit growth rate.
Those sums cover the range's **non-merge** commits only, and they are always integers: an unmeasurable revision is left out of them rather than nulling them.
Rank on `files`, then open the top of the ranking and read each file's real current size and structure before calling anything a god-class — high net churn makes a file a candidate to inspect, not a verdict on its own.
`binary_revisions` counts that path's revisions whose churn could not be measured, so its true volume is *at least* what the sums report
`merges_measured` short of `merge_count` means some merges were never measured at all, which caps how complete the ranking can be
`merge_files` mostly restates churn `files` already counted, so summing the two double counts — but it is not redundant, because a merge's first-parent diff also carries whatever the conflict resolution itself added, code that lives in no non-merge commit and therefore appears in `files` nowhere.
So read `merge_files` separately, for the paths whose churn shows up only there, rather than discarding it as double counting.
Whether a flagged file is genuinely a god-class or legitimately large stays your judgment.
<!-- vpmodule:atom:end rank-the-files-by-churn-and-then-read-them -->
<!-- vpmodule:atom:begin reconcile-the-as-built-with-the-spec -->
---
instruction_id: reconcile-the-as-built-with-the-spec
title: Reconcile the as-built with the spec
summary: "Every divergence between the as-built and the declared intent is classified as a defect, an accepted deviation or a spec that has to be reconciled."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work is compared with the criteria it set for itself.
conditions_does_not_apply_when: The work changed no behavior and no requirement.
artifact_contract_output_type: spec-reconciliation
artifact_contract_required_data:
  - the divergence
  - its class
  - the requirement or the criterion it touches
artifact_contract_verified_by: "every divergence is classified as a defect, an accepted deviation or a reconciliation to propose"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/aggregate-views.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/post-execution-verification.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - operations
---

# Reconcile the as-built with the spec
**Spec-to-implementation reconciliation** — where the as-built diverges from the epic file's Requirements and Done when, and the tickets' own Requirements.
Requirements silently dropped, added behavior nobody specified, intent reinterpreted between tickets.
Each divergence is either a defect (fix), an accepted deviation (record so later runs stop re-flagging it), or a spec that should be reconciled to reality (propose in Phase 4).
After a release, review the project description against what was actually built and update every field that drifted.
"What This Is" accuracy: compare the current description to what was built and update it if the product has meaningfully changed.
Core Value check: still the right priority? Did shipping reveal a different core value?
Out of Scope audit: review each item - is the reasoning still valid? Remove the items that are irrelevant.
Key Decisions audit: extract all decisions from the phase summaries and add them with their outcomes.
All shipped requirements move to the validated section.
System MUST check against phase goals, not just task completion
Automated check that the codebase delivers what the phase promised.
<!-- vpmodule:atom:end reconcile-the-as-built-with-the-spec -->