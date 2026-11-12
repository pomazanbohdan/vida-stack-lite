---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-review-md-3b83cee9-c02"
title: "gsd-core: gsd-core/workflows/review.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/review.md\"}"
atom_ids:
  - treat-an-explicitly-named-reviewer-as-a-requirement
  - weight-a-review-by-the-evidence-it-was-collected-under
  - write-no-artifact-when-every-input-failed
  - write-the-unknown-value-instead-of-omitting-the-key
atom_count: 4
atoms: "[{\"atom_id\":\"treat-an-explicitly-named-reviewer-as-a-requirement\",\"file_sha256\":\"a1e36583ae8fb3cdb47aaf23250ea39e131101fe2d334aecaea7d924f4143060\",\"content_sha256\":\"8f61325a247a4217c6552cf5e79202d217f1f6212f359a5882d9849575454c25\",\"file_bytes\":1789,\"body_bytes\":550},{\"atom_id\":\"weight-a-review-by-the-evidence-it-was-collected-under\",\"file_sha256\":\"9db803cdb7dd690cc9af809b026aaeb3f2b4b07bce5cfe1c2298b79790251174\",\"content_sha256\":\"17caac3a0855530903d2ecda7b1d35641747e58e6a12f25288e5d5adcedff657\",\"file_bytes\":1440,\"body_bytes\":212},{\"atom_id\":\"write-no-artifact-when-every-input-failed\",\"file_sha256\":\"24b14232e53c0bced4610c5ca0668c91e5664bf7296774fec4d9ecab12e62429\",\"content_sha256\":\"1274544dbe32d6b74a92d502544a82b0512941dba76543a86db076c84c5406e8\",\"file_bytes\":1374,\"body_bytes\":242},{\"atom_id\":\"write-the-unknown-value-instead-of-omitting-the-key\",\"file_sha256\":\"f5d30b98e0201b298b9e44be502a2e8e89f76e4ab3314c7f3104472a21077c59\",\"content_sha256\":\"46468798fac2b6fd938d31c72cf9195d90379ede8611c40a28b48d4ac973764c\",\"file_bytes\":1338,\"body_bytes\":253}]"
carrier_sha256: 5dd50a69d7bacc9fb093524cd039f29d8ca4d6f181648ddabeabb17152fa78e3
carrier_bytes: 6566
revision: 1
status: active
---
<!-- vpmodule:atom:begin treat-an-explicitly-named-reviewer-as-a-requirement -->
---
instruction_id: treat-an-explicitly-named-reviewer-as-a-requirement
title: Treat an explicitly named reviewer as a requirement
summary: "A reviewer the owner named on the command line is an assertion, not a preference: if it cannot run that is an error that is surfaced, while a configured default set is a preference across hosts and only fails when none of it can run."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A set of reviewers is selected, some of them named by the owner."
conditions_does_not_apply_when: The reviewers are chosen by the run itself and nobody named one.
artifact_contract_output_type: reviewer-selection
artifact_contract_required_data:
  - the named reviewers
  - the one that could not run
  - the error that was raised
artifact_contract_verified_by: a named reviewer that could not run produced an error instead of a thinner set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Treat an explicitly named reviewer as a requirement
A lane the user named on the command line and that cannot run is an **error**, surfaced and non-silent
even when other named lanes did run
Do not proceed with a thinner reviewer set and report success
not finding a lane nobody asked for is normal; failing to run a lane somebody asked for is an error
a configured default is a preference evaluated across many hosts, so a subset being present is expected, not an error
If all configured reviewers are unavailable, fail with an actionable message
<!-- vpmodule:atom:end treat-an-explicitly-named-reviewer-as-a-requirement -->
<!-- vpmodule:atom:begin weight-a-review-by-the-evidence-it-was-collected-under -->
---
instruction_id: weight-a-review-by-the-evidence-it-was-collected-under
title: Weight a review by the evidence it was collected under
summary: "A reviewer that ran without source access, or one that never received the source-grounded prompt, contributes its concerns but not a verdict at full weight; the consensus is computed from the grounded reviewers."
capability_tags:
  - review-code
pattern_tags:
  - trust-graded-context
conditions_applies_when: Findings from reviewers with different evidence are combined into one consensus.
conditions_does_not_apply_when: Every reviewer worked with the same evidence.
artifact_contract_output_type: weighted-consensus
artifact_contract_required_data:
  - the reviewers
  - the evidence class of each
  - the ones that carry full weight
artifact_contract_verified_by: the reviewers without source grounding are noted but do not carry the consensus
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Weight a review by the evidence it was collected under
do not weight its verdict as a grounded plan review — fold in its diff findings
note its concerns, but do not count its verdict at full consensus weight
<!-- vpmodule:atom:end weight-a-review-by-the-evidence-it-was-collected-under -->
<!-- vpmodule:atom:begin write-no-artifact-when-every-input-failed -->
---
instruction_id: write-no-artifact-when-every-input-failed
title: Write no artifact when every input failed
summary: "When every reviewer failed or every reviewer was skipped, no review document is written and nothing is committed; the failure is reported instead of a summary that claims a review ran."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: The inputs of an artifact all failed or all were skipped.
conditions_does_not_apply_when: At least one input produced a result.
artifact_contract_output_type: failed-run-report
artifact_contract_required_data:
  - the lanes that failed
  - the lanes that were skipped
  - the fact that no artifact was written
artifact_contract_verified_by: no document was written and no commit was made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write no artifact when every input failed
do NOT write `REVIEWS.md` and do NOT run the commit below — there is nothing to review
Report the total lane failure to the user
do not proceed to `present_results`' summary claiming a review ran
<!-- vpmodule:atom:end write-no-artifact-when-every-input-failed -->
<!-- vpmodule:atom:begin write-the-unknown-value-instead-of-omitting-the-key -->
---
instruction_id: write-the-unknown-value-instead-of-omitting-the-key
title: Write the unknown value instead of omitting the key
summary: "When a value cannot be recovered it is written as the explicit unknown, because an omitted key cannot be told apart from the feature never having run."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A record is written with one entry per participant and a value may be missing.
conditions_does_not_apply_when: Every value is known.
artifact_contract_output_type: record-with-unknowns
artifact_contract_required_data:
  - the entries
  - the unknown values
artifact_contract_verified_by: the key sets match and the unknown is written rather than left out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write the unknown value instead of omitting the key
Write the literal `unknown` rather than omitting a key
an omitted key is indistinguishable from the feature not having run
a reader must be able to tell *no model recorded* from *nothing to look at*
<!-- vpmodule:atom:end write-the-unknown-value-instead-of-omitting-the-key -->