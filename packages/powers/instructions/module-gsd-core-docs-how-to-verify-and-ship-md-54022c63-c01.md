---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-verify-and-ship-md-54022c63-c01"
title: "gsd-core: docs/how-to/verify-and-ship.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/verify-and-ship.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/verify-and-ship.md\"}"
atom_ids:
  - close-the-gaps-with-a-checked-plan-before-applying-them
  - infer-the-severity-from-the-users-words
  - re-check-a-passing-verification-against-a-content-digest
atom_count: 3
atoms: "[{\"atom_id\":\"close-the-gaps-with-a-checked-plan-before-applying-them\",\"file_sha256\":\"bc998f5ac5f655c3c47566dc1b2a609b629afafcfb120599edfc23fda20cc611\",\"content_sha256\":\"611aeafa4543b9172fc86fad4320409a50b56758336e5f0e4381cc309d0e8786\",\"file_bytes\":1463,\"body_bytes\":228},{\"atom_id\":\"infer-the-severity-from-the-users-words\",\"file_sha256\":\"7007889a40dba448dd4e438e9d6d08e8b0b602819b525e50c23465d969bf0093\",\"content_sha256\":\"d92a3fd7101e395eda3c2bba1cbdd0cc75313de43696c22b314f8ccfcf5e8564\",\"file_bytes\":2231,\"body_bytes\":949},{\"atom_id\":\"re-check-a-passing-verification-against-a-content-digest\",\"file_sha256\":\"4c870bf234e809283aaac6605c154cbdc93509ca2fc1dcbbfb499b32ba70efbb\",\"content_sha256\":\"77a1cad4639890ffef1cabd2654e83e82fe6e1897c776e7d2b482beda185c9a5\",\"file_bytes\":1891,\"body_bytes\":758}]"
carrier_sha256: 16ba6fdc85de8218d0a23528f7b9f691e2b144de21d7db4711fbb676125009ba
carrier_bytes: 6058
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-the-gaps-with-a-checked-plan-before-applying-them -->
---
instruction_id: close-the-gaps-with-a-checked-plan-before-applying-them
title: Close the gaps with a checked plan before applying them
summary: "The repair of a failed check is planned and checked before it is executed, and the plan is iterated until it passes."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - verification-before-completion
conditions_applies_when: Failures were found and the repair is about to be planned.
conditions_does_not_apply_when: The failures are already fixed.
artifact_contract_output_type: gap-closure-plan
artifact_contract_required_data:
  - the plan that closes the gaps
  - the verdict of the check on it
artifact_contract_verified_by: the repair plan passed the check before it was offered for execution
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-and-ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a root-cause action, then ends after a colon introducing the next step without stating it; the incomplete sequence cannot support a reliable form or domain."
---

# Close the gaps with a checked plan before applying them
**Diagnoses root causes** — spawns parallel debug agents, one per issue, and updates `UAT.md` with root causes.
**Presents next step** — when plans pass the checker:
<!-- vpmodule:atom:end close-the-gaps-with-a-checked-plan-before-applying-them -->
<!-- vpmodule:atom:begin infer-the-severity-from-the-users-words -->
---
instruction_id: infer-the-severity-from-the-users-words
title: "Infer the severity from the user's words"
summary: "The severity is read off the words the person used and never asked for; when the words do not settle it, the middle level is the answer."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A person described a problem in their own words.
conditions_does_not_apply_when: The severity was already settled.
artifact_contract_output_type: severity-statement
artifact_contract_required_data:
  - the words
  - the severity they imply
artifact_contract_verified_by: the severity was inferred from the words and no severity question was asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-and-ship.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Infer the severity from the user's words
Infer severity from description:
Contains: crash, error, exception, fails, broken, unusable
Contains: doesn't work, wrong, missing, can't
Contains: slow, weird, off, minor, small
Contains: color, font, spacing, alignment, visual
Critical for the crash list, Important for the does-not-work list, Minor for the slow list and for the visual list.
Default if unclear
if unclear. User can correct if needed.
**Never ask "how severe is this?"** - just infer and move on.
# Infer the severity from the words the user used
Severity is INFERRED from user's natural language, never asked.
| Crash, error, exception, fails completely, unusable → Critical | Doesn't work, nothing happens, wrong behavior, missing → Important | Works but..., slow, weird, minor, small issue → Minor | Color, font, spacing, alignment, visual, looks off → Minor |
Default: **Important** (safe default, user can clarify if wrong)
<!-- vpmodule:atom:end infer-the-severity-from-the-users-words -->
<!-- vpmodule:atom:begin re-check-a-passing-verification-against-a-content-digest -->
---
instruction_id: re-check-a-passing-verification-against-a-content-digest
title: Re-check a passing verification against a content digest
summary: "A pass is re-checked against a digest of every covered input, and a checkout that changes the bytes is fixed rather than called drift."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A completion gate reads a verification report that says passed.
conditions_does_not_apply_when: The gate does not read a verification report.
artifact_contract_output_type: verification-freshness
artifact_contract_required_data:
  - the digest of the covered inputs
  - the verdict the gate produced
artifact_contract_verified_by: the digest was recomputed and the verdict states whether it still holds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-and-ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Re-check a passing verification against a content digest
A `*-VERIFICATION.md` reporting `status: passed` is re-checked, not cached, every time a completion gate reads it.
The verifier records a digest of every input its verdict covers — the phase's `PLAN.md`/`SUMMARY.md` files, mapped requirements, and implementation files in the change set.
If any of those files changes, disappears, or becomes unreadable after verification, the gate recomputes the digest, finds a mismatch, and reports `stale`.
A checkout without a `.gitattributes` `eol=lf` rule pinning text files to LF (a Windows checkout with `core.autocrlf=true`, for example) can report `stale` on unchanged content — fix with a `.gitattributes` `eol=lf` rule, not by treating it as drift.
<!-- vpmodule:atom:end re-check-a-passing-verification-against-a-content-digest -->