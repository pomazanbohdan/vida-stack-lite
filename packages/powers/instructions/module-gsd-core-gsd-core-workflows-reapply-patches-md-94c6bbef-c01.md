---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-reapply-patches-md-94c6bbef-c01"
title: "gsd-core: gsd-core/workflows/reapply-patches.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/reapply-patches.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/reapply-patches.md\"}"
atom_ids:
  - a-self-reported-table-is-not-the-evidence
  - merge-against-a-verified-baseline-and-escalate-a-two-sided-change
  - never-conclude-already-adopted-from-resemblance
  - never-skip-a-backed-up-file-as-having-no-custom-content
atom_count: 4
atoms: "[{\"atom_id\":\"a-self-reported-table-is-not-the-evidence\",\"file_sha256\":\"1770bcc90f26c458277e0919c199d5140c6ae13a49088aa8968c5a3ce1553a93\",\"content_sha256\":\"c96c994dc4cd73cbd84158a7b492a9f54d184a7c439316aad1d5636877548537\",\"file_bytes\":1536,\"body_bytes\":375},{\"atom_id\":\"merge-against-a-verified-baseline-and-escalate-a-two-sided-change\",\"file_sha256\":\"ef35519e42c604efaebcb89942f1961da39b3a132ca71cc18e6ad872ba311052\",\"content_sha256\":\"e0e8044f32c7cd157f3c7f5a13629af4c40ecfd4a6cbb6812f65ad8900e20dd4\",\"file_bytes\":1928,\"body_bytes\":611},{\"atom_id\":\"never-conclude-already-adopted-from-resemblance\",\"file_sha256\":\"7181388ba1282232b72c99d8c224c1fa14e2e65da03b93e6fe14c71ff1cf4845\",\"content_sha256\":\"f4720c5fd176e45ce78322f54479032d36619a98b972242b9a757ad6baab905e\",\"file_bytes\":1612,\"body_bytes\":390},{\"atom_id\":\"never-skip-a-backed-up-file-as-having-no-custom-content\",\"file_sha256\":\"2339e8f44b7e25a045c3d5c4cfdd2c7021891fd40d64c491abe40937ab5cf473\",\"content_sha256\":\"2f213c2047d7f94d77f4323fb6a32c97601180931cbfc624f0a122b079db15fc\",\"file_bytes\":1627,\"body_bytes\":396}]"
carrier_sha256: c42d9e680277ab210cc052d737c2f832558acd4f1ca6f1a24b2a2fdb78729790
carrier_bytes: 7350
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-self-reported-table-is-not-the-evidence -->
---
instruction_id: a-self-reported-table-is-not-the-evidence
title: A self-reported table is not the evidence
summary: "A table you filled in yourself does not prove that the content survived the merge; the check has to be run structurally, and a false halt is preferred over a silent success on lost content."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A merge or a rewrite produced a report about what was preserved.
conditions_does_not_apply_when: Nothing was merged or rewritten.
artifact_contract_output_type: preservation-check
artifact_contract_required_data:
  - the check that ran
  - the hunks it confirmed
  - the misses it found
artifact_contract_verified_by: the check ran against the content itself and not against a self-filled table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# A self-reported table is not the evidence
Do NOT rely solely on the free-text `verified: yes/no` Hunk Verification Table
that table being filled in without an actual content-presence check
The script performs the check structurally and exits non-zero on any miss
Layered gates favour false-positive halts (recoverable) over silent successes on lost content (unrecoverable)
<!-- vpmodule:atom:end a-self-reported-table-is-not-the-evidence -->
<!-- vpmodule:atom:begin merge-against-a-verified-baseline-and-escalate-a-two-sided-change -->
---
instruction_id: merge-against-a-verified-baseline-and-escalate-a-two-sided-change
title: Merge against a verified baseline and escalate a two-sided change
summary: "A local change is merged with the version that replaced it against a baseline whose identity is verified; what the local side changed and what the other side changed are separated, and a section changed on both sides is shown to the owner."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A local modification has to be carried over to a version that replaced the file.
conditions_does_not_apply_when: The file was not modified locally.
artifact_contract_output_type: three-way-merge
artifact_contract_required_data:
  - the baseline
  - the local changes
  - the incoming changes
  - the conflicts shown to the owner
artifact_contract_verified_by: the baseline is the verified original and every two-sided section was shown to the owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Merge against a verified baseline and escalate a two-sided change
The quality of the merge depends on having a **pristine baseline** — the original unmodified version of each file
returns the commit that *first added* the file, which is the wrong baseline
matching against it finds the correct baseline regardless of how many updates have occurred
**User changes** = diff(pristine → user's version) — these are the customizations to preserve
**Upstream changes** = diff(pristine → new version) — these are version updates to accept
Sections changed by both → flag as CONFLICT, show both, ask user
<!-- vpmodule:atom:end merge-against-a-verified-baseline-and-escalate-a-two-sided-change -->
<!-- vpmodule:atom:begin never-conclude-already-adopted-from-resemblance -->
---
instruction_id: never-conclude-already-adopted-from-resemblance
title: Never conclude already-adopted from resemblance
summary: "The verdict that an upstream version already carries a customization comes from a structural check that every significant added line is present — never from a signature line, a heading or a general resemblance."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A local change is compared with the version that replaced it.
conditions_does_not_apply_when: The two versions are compared only for the report.
artifact_contract_output_type: adoption-verdict
artifact_contract_required_data:
  - the added lines
  - the check that confirmed them
  - the verdict
artifact_contract_verified_by: "the verdict rests on every significant added line being present, not on a resemblance"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never conclude already-adopted from resemblance
Never conclude `Incorporated` from a signature line, a heading, or general resemblance
the classifier excludes structural/trivial lines and requires every significant user-added line to be present
because a false `Incorporated` silently retires a live customization
That is the only ground on which the `Incorporated` status below is valid
<!-- vpmodule:atom:end never-conclude-already-adopted-from-resemblance -->
<!-- vpmodule:atom:begin never-skip-a-backed-up-file-as-having-no-custom-content -->
---
instruction_id: never-skip-a-backed-up-file-as-having-no-custom-content
title: Never skip a backed-up file as having no custom content
summary: "A file that was backed up because it was detected as modified can never be classified as free of custom content; when the difference looks mechanical it is still a conflict for the owner, not a silent skip."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A set of backed-up files is classified after a replacement of the originals.
conditions_does_not_apply_when: A file was never detected as modified and was never backed up.
artifact_contract_output_type: file-classification
artifact_contract_required_data:
  - the file
  - the detected differences
  - the classification
artifact_contract_verified_by: no backed-up file was classified as having no custom content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never skip a backed-up file as having no custom content
The workflow must NEVER conclude "no custom content" for any backed-up file — that is a logical contradiction
When in doubt, classify as CONFLICT requiring user review, not SKIP
"No custom content" is never a valid conclusion
The installer's hash check already proved this file was modified
Never report `Skipped — no custom content`
<!-- vpmodule:atom:end never-skip-a-backed-up-file-as-having-no-custom-content -->