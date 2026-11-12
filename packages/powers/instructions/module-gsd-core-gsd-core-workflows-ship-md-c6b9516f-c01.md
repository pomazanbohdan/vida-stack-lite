---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-ship-md-c6b9516f-c01"
title: "gsd-core: gsd-core/workflows/ship.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/ship.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/ship.md\"}"
atom_ids:
  - block-the-ship-until-verification-passes
  - escape-every-cell-of-a-generated-table
  - fail-closed-on-an-ambiguous-gate-value
  - keep-an-advisory-step-failure-from-blocking-the-main-path
  - keep-the-core-sections-of-a-generated-report-frozen
  - normalize-a-noisy-trail-to-a-fixed-vocabulary
  - omit-the-section-that-would-carry-no-information
  - push-the-ship-note-onto-the-branch-it-travels-on
atom_count: 8
atoms: "[{\"atom_id\":\"block-the-ship-until-verification-passes\",\"file_sha256\":\"fb25ed1d86eaf09555c7d37c42b6f8a81e2e6ecd79c5c6d66870a74bd6407fb8\",\"content_sha256\":\"5f910209d89266fbec74a54b86a4016f60e047fb71203c00c089ba49c6940ea4\",\"file_bytes\":1913,\"body_bytes\":769},{\"atom_id\":\"escape-every-cell-of-a-generated-table\",\"file_sha256\":\"94352c8b477993a7a2805b58bcf2d3707e3975253a64fb1bc7c03cc42d5b736b\",\"content_sha256\":\"155a0a4b57787556b143058064523d5e9582e6eb933eb90c38866da5e5a5986b\",\"file_bytes\":1503,\"body_bytes\":401},{\"atom_id\":\"fail-closed-on-an-ambiguous-gate-value\",\"file_sha256\":\"065b13bd2bea0693ade222d2b0345b99832d773e269f45b782da6e27cee5f4ca\",\"content_sha256\":\"8a136928a54bae31025f54312b6e6e0c6cb136ad074bdcb77c214286da6e54b5\",\"file_bytes\":1793,\"body_bytes\":648},{\"atom_id\":\"keep-an-advisory-step-failure-from-blocking-the-main-path\",\"file_sha256\":\"4364c4a008d15a4db467c26f0cae46cb151e3d9edb60e8866356d66059494c7a\",\"content_sha256\":\"92829cf1aa82301c1d6e2e86af2199f32df0afd00209c2a45da7c98d9058f37b\",\"file_bytes\":1613,\"body_bytes\":466},{\"atom_id\":\"keep-the-core-sections-of-a-generated-report-frozen\",\"file_sha256\":\"29e6f96ded7060aae3a0ac6230ea7f57874cc73b9dcc72b4672aaecf3f2229ed\",\"content_sha256\":\"650138b365034411c911a98b880bda8a68817930e51c552f5ba00f52d79bb43a\",\"file_bytes\":1497,\"body_bytes\":353},{\"atom_id\":\"normalize-a-noisy-trail-to-a-fixed-vocabulary\",\"file_sha256\":\"809ade4b21f32101f27d89f185fc27da12c1c22761936686c3883d1101857c0d\",\"content_sha256\":\"1b33c2dec96917b86d029993bcade8694f53d1cef83d8f795872dbc82278d8a6\",\"file_bytes\":1606,\"body_bytes\":438},{\"atom_id\":\"omit-the-section-that-would-carry-no-information\",\"file_sha256\":\"ff5c2a8668ece58bbcaba6862e135f8da45e500fdd3708b9f37a578952f21061\",\"content_sha256\":\"63a6e5da359d68b74be470cb220ab1a3d87886a871c3e644ac01d2cfe0ad404b\",\"file_bytes\":1793,\"body_bytes\":545},{\"atom_id\":\"push-the-ship-note-onto-the-branch-it-travels-on\",\"file_sha256\":\"38e6582762639e7c817b74aacd0c68cedbe1b20173a60d0a43a5d1586819599b\",\"content_sha256\":\"38ad48d384cbedc64e77a973a2504cecde29af1e892a4cc24dd655d3d813839e\",\"file_bytes\":1476,\"body_bytes\":309}]"
carrier_sha256: 06d344146bbce1fc2be5ed8b5ffc85203090db199b9ec4080750afd9299bfd87
carrier_bytes: 14387
revision: 1
status: active
---
<!-- vpmodule:atom:begin block-the-ship-until-verification-passes -->
---
instruction_id: block-the-ship-until-verification-passes
title: Block the ship until verification passes
summary: "A release reads the verification status through its owner; only a passed status lets the work ship, and a failed read is a hard error, never an empty result."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A finished piece of work is about to be released and a verification report exists for it.
conditions_does_not_apply_when: There is no verification report to read.
artifact_contract_output_type: ship-gate-decision
artifact_contract_required_data:
  - the verification status
  - the next action when the gate blocks
  - the command to run next
artifact_contract_verified_by: the release proceeds only on a passed verification status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Block the ship until verification passes
Only `passed` may ship.
If `$STATUS` is `passed`, verification is complete — continue to the next preflight check; do not read any further verification field.
A non-zero exit above is a hard error (a report `status` outside `passed | gaps_found | human_needed`): present the error and stop.
Any other value (including `gaps_found`, `human_needed`, `stale`, `missing`, and `phase_dir_not_found`) blocks with `PHASE_VERIFICATION_INCOMPLETE`.
Present `$NEXT_ACTION` to the user and, when `$NEXT_COMMAND` is non-empty, show it as the command to run next.
These two are message text only — the block/allow decision has already been made from `$STATUS`, so a concurrent write between the reads cannot change the gate's verdict.
<!-- vpmodule:atom:end block-the-ship-until-verification-passes -->
<!-- vpmodule:atom:begin escape-every-cell-of-a-generated-table -->
---
instruction_id: escape-every-cell-of-a-generated-table
title: Escape every cell of a generated table
summary: "Every cell of a generated table is escaped and every record field is checked, so an adversarial input cannot break the table or the record boundaries."
capability_tags:
  - treat-runtime-content-as-untrusted
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A table is generated from text that somebody else wrote.
conditions_does_not_apply_when: Every cell is written by the agent itself.
artifact_contract_output_type: generated-table
artifact_contract_required_data:
  - the cells
  - the escaping applied
  - the rejected records
artifact_contract_verified_by: no cell can carry a delimiter or a line break out of its column or record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Escape every cell of a generated table
Harden every table cell against injection, not just subjects: escape `|` as `\|` and strip `\r`/`\n` from both commit subjects and the rendered `gate-status` value.
Prefer NUL (`-z` / `%x00`) record separation, and reject any record whose fields contain the `\x1f`/`\x1e` delimiters, so an adversarial commit message cannot corrupt record or field boundaries.
<!-- vpmodule:atom:end escape-every-cell-of-a-generated-table -->
<!-- vpmodule:atom:begin fail-closed-on-an-ambiguous-gate-value -->
---
instruction_id: fail-closed-on-an-ambiguous-gate-value
title: Fail closed on an ambiguous gate value
summary: "A gate passes only on an exact value; a missing, non-numeric or unparsable reading blocks instead of being read as a pass."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A gate compares a recorded value against an exact expectation before the work may continue.
conditions_does_not_apply_when: The gate has no value to read and no way to obtain one.
artifact_contract_output_type: gate-verdict
artifact_contract_required_data:
  - the value that was read
  - the exact value the gate demands
  - the reason the reading is refused
artifact_contract_verified_by: the gate passes only on the exact value and refuses every other reading
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail closed on an ambiguous gate value
The gate passes **only** when `threats_open` is exactly `0`.
For any other value — `threats_open` > 0, or a missing / non-numeric / unparsable field — **fail closed** with `block: true` and `SECURITY_SHIP_GATE_OPEN_THREATS` (the predicate is strict equality to `0`; never ship on an ambiguous value):
**`WINDOWS_OPEN_COUNT` is `"?"`, empty, or non-numeric** → **fail closed** with `block: true` and `WINDOWS_SHIP_GATE_READ_FAILED` (the gate is strict equality to `0`; never ship on an unreadable ledger):
The ledger may be malformed; fix it before shipping (an unparseable ledger is a broken window).
<!-- vpmodule:atom:end fail-closed-on-an-ambiguous-gate-value -->
<!-- vpmodule:atom:begin keep-an-advisory-step-failure-from-blocking-the-main-path -->
---
instruction_id: keep-an-advisory-step-failure-from-blocking-the-main-path
title: Keep an advisory step failure from blocking the main path
summary: An optional or post-hoc step that fails produces a warning and the flow continues; it never undoes or blocks the result that was already produced.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: "An optional check, an external tool or a post-result step runs and may fail."
conditions_does_not_apply_when: The step is the gate that decides whether the result may exist.
artifact_contract_output_type: advisory-step-outcome
artifact_contract_required_data:
  - the step that failed
  - the warning
  - the path that continues
artifact_contract_verified_by: the main path continues after the warning
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep an advisory step failure from blocking the main path
On failure, warn with stderr output and fall through to the manual review flow below.
If JSON is invalid (`INVALID_JSON`): warn "External review returned invalid JSON" with stderr and continue.
Regardless of the external review result, fall through to the manual review options below.
All `ship:post` hooks are post-ship and additive (`onError: skip`); a failure here never affects the already-created PR.
<!-- vpmodule:atom:end keep-an-advisory-step-failure-from-blocking-the-main-path -->
<!-- vpmodule:atom:begin keep-the-core-sections-of-a-generated-report-frozen -->
---
instruction_id: keep-the-core-sections-of-a-generated-report-frozen
title: Keep the core sections of a generated report frozen
summary: "Extra sections are appended after the required ones; they never replace, remove or reorder the core sections of the report."
capability_tags:
  - define-output-format
pattern_tags:
  - override-layering
conditions_applies_when: A report is assembled from a fixed set of required sections plus optional extra ones.
conditions_does_not_apply_when: The report has no fixed core and every section is optional.
artifact_contract_output_type: report-body
artifact_contract_required_data:
  - the required core sections
  - the extra sections
  - the order they are rendered in
artifact_contract_verified_by: "the core sections are present, in order, and the extras come after them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the core sections of a generated report frozen
Treat configured sections as append-only.
They are rendered after `Key Decisions` and cannot replace, remove, or reorder the required core sections: `Summary`, `Changes`, `Requirements Addressed`, `Verification`, and `Key Decisions`.
Omit sections whose final rendered body is empty after trimming.
<!-- vpmodule:atom:end keep-the-core-sections-of-a-generated-report-frozen -->
<!-- vpmodule:atom:begin normalize-a-noisy-trail-to-a-fixed-vocabulary -->
---
instruction_id: normalize-a-noisy-trail-to-a-fixed-vocabulary
title: Normalize a noisy trail to a fixed vocabulary
summary: "A raw signal is mapped onto a closed set of values; anything absent, unrecognised or ambiguous becomes the explicit missing value and is still listed."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A raw record carries a value that has to be reported in a fixed vocabulary.
conditions_does_not_apply_when: The value is already one of the permitted values and is unambiguous.
artifact_contract_output_type: normalized-trail
artifact_contract_required_data:
  - the record
  - the normalized value
  - the entries that carry no value
artifact_contract_verified_by: every record carries exactly one of the permitted values and no record is dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Normalize a noisy trail to a fixed vocabulary
Surface each commit's `gate-status:` value, normalized to exactly one of `skill`, `fallback`, `exempt`, or `missing` — never the raw trailer text.
A commit whose trailer is absent, whose value is none of the first three, or which carries more than one `gate-status:` trailer (ambiguous) is counted as **missing** and still listed.
This section is informational; it never blocks the ship.
<!-- vpmodule:atom:end normalize-a-noisy-trail-to-a-fixed-vocabulary -->
<!-- vpmodule:atom:begin omit-the-section-that-would-carry-no-information -->
---
instruction_id: omit-the-section-that-would-carry-no-information
title: Omit the section that would carry no information
summary: "A section whose every entry is empty is not emitted at all; an all-empty table is noise, and a zero count is not worth a line."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A report contains a section whose entries may all be empty or zero.
conditions_does_not_apply_when: The section always carries at least one real entry.
artifact_contract_output_type: report-body
artifact_contract_required_data:
  - the section
  - the entries that carry a real value
  - the decision to emit or omit
artifact_contract_verified_by: the section is emitted only when it carries at least one real value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/stats.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Omit the section that would carry no information
**Self-suppress when every commit is missing (#2431):** the execute pipeline only writes `gate-status:` trailers when TDD mode is active.
If every commit in the scan normalizes to `missing`, skip this section and the aggregate trailer (step 9) entirely — a 100%-missing table is pure noise.
Only emit when at least one commit carries a real value (`skill`, `fallback`, or `exempt`).
If `MVP_COUNT == 0`, the project has no MVP-mode phases — omit the line (no clutter for non-MVP projects).
<!-- vpmodule:atom:end omit-the-section-that-would-carry-no-information -->
<!-- vpmodule:atom:begin push-the-ship-note-onto-the-branch-it-travels-on -->
---
instruction_id: push-the-ship-note-onto-the-branch-it-travels-on
title: Push the ship note onto the branch it travels on
summary: "The note that records the shipping action is committed and pushed onto the same branch as the change, so it is not lost when that branch is deleted."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - branch-integration
conditions_applies_when: A record of the shipping action is committed next to the change that is being shipped.
conditions_does_not_apply_when: The record is kept only locally by design.
artifact_contract_output_type: ship-note
artifact_contract_required_data:
  - the note
  - the branch it is pushed to
  - where it ends up after the merge
artifact_contract_verified_by: the note is pushed onto the branch that carries the change into the default branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Push the ship note onto the branch it travels on
If `commit_docs` is true, commit the ship-note AND push it onto the PR branch so it reaches the default branch when the PR merges.
Without this push the ship-note commit stays local-only and is silently discarded when the branch is deleted on merge (#2138).
<!-- vpmodule:atom:end push-the-ship-note-onto-the-branch-it-travels-on -->