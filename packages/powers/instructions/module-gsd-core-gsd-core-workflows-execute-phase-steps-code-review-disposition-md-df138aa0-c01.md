---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-code-review-disposition-md-df138aa0-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/code-review-disposition.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/code-review-disposition.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/code-review-disposition.md\"}"
atom_ids:
  - display-the-tool-output-verbatim
  - do-not-let-a-malformed-report-read-as-a-clean-one
  - report-the-breakdown-only-when-it-is-complete
  - take-the-severity-from-the-reviewer-first
atom_count: 4
atoms: "[{\"atom_id\":\"display-the-tool-output-verbatim\",\"file_sha256\":\"23601e137b65227d7aa9f60656cc26453bfaab69362db55822adf644601b0e29\",\"content_sha256\":\"ed5cfe7598d4cf11fddb9320de9869e4358bceb343e3b31468cf7215e73dab83\",\"file_bytes\":1177,\"body_bytes\":180},{\"atom_id\":\"do-not-let-a-malformed-report-read-as-a-clean-one\",\"file_sha256\":\"8bcf1d2ea6e299404f6880caeb827d1d23de94ad62fbfb39e9c198403c9fc0a6\",\"content_sha256\":\"de20db719186886a4a2e563d9c4441f5dbe5f2e1e4277f02104cd2df75c2c930\",\"file_bytes\":1689,\"body_bytes\":598},{\"atom_id\":\"report-the-breakdown-only-when-it-is-complete\",\"file_sha256\":\"e8f05cd2508ec72cabb6e9744aed5c3d6461506b89cb1f3a7dd918415619ab79\",\"content_sha256\":\"b7250ea6a0b09b4d266002330f3fc5c9e9c715d5ac070768a1fd88a90237f7e7\",\"file_bytes\":1476,\"body_bytes\":442},{\"atom_id\":\"take-the-severity-from-the-reviewer-first\",\"file_sha256\":\"4e7ad2c46d8d7b1a21efcb3df1eb22ddebee416deba7ab8ceec938e889d99e3c\",\"content_sha256\":\"8c46be98f09795292410bd5a0a4752583c84f63623d5daa8dea4524403bc6dcf\",\"file_bytes\":1514,\"body_bytes\":401}]"
carrier_sha256: b65536debfc2e1ef50cf08142271518d768598424b52642e4380b7db598ed6a8
carrier_bytes: 6421
revision: 1
status: active
---
<!-- vpmodule:atom:begin display-the-tool-output-verbatim -->
---
instruction_id: display-the-tool-output-verbatim
title: Display the tool output verbatim
summary: The numbers shown are the ones the tool printed and are not recomputed.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A tool has already computed the values that the report must show.
conditions_does_not_apply_when: The values are being computed by the agent itself.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the tool output
artifact_contract_verified_by: "the shown numbers are the ones the tool printed, not recomputed ones"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Display the tool output verbatim
Display that block's stdout verbatim.
Do not re-derive any of it — a number the shell computed and did not print is gone once the fence closes
<!-- vpmodule:atom:end display-the-tool-output-verbatim -->
<!-- vpmodule:atom:begin do-not-let-a-malformed-report-read-as-a-clean-one -->
---
instruction_id: do-not-let-a-malformed-report-read-as-a-clean-one
title: Do not let a malformed report read as a clean one
summary: A report that cannot be parsed is announced as such and never shown as a clean one.
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A report that should carry findings cannot be read as it should be.
conditions_does_not_apply_when: The report was read and parsed.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the state of the report
  - what could not be trusted
artifact_contract_verified_by: an unparseable report was announced as unparseable and not silently shown as clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not let a malformed report read as a clean one
NO STATUS is not NO REVIEW.
A review that reports findings NONE of which this parser understood is also something to record, and it is the case with the least evidence anywhere else.
Partial shortfalls (some findings parsed, some not) always reported, which is exactly why the total one read as covered.
the result is a zero-row ledger carrying an unparsed key -- an honest record that the review declared findings and none of them were understood, which is strictly better than the file not existing.
Surfaced, not thrown: the gate is advisory.
<!-- vpmodule:atom:end do-not-let-a-malformed-report-read-as-a-clean-one -->
<!-- vpmodule:atom:begin report-the-breakdown-only-when-it-is-complete -->
---
instruction_id: report-the-breakdown-only-when-it-is-complete
title: Report the breakdown only when it is complete
summary: A breakdown of counts is printed only when every count is a number and they add up.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report carries counts of findings by severity.
conditions_does_not_apply_when: The report carries a single verdict and no counts.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the counts by severity
artifact_contract_verified_by: the breakdown was printed only when every count was a number and they added up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report the breakdown only when it is complete
The breakdown is reportable only when ALL FOUR counts are numbers.
A count that is empty
non-numeric, over-long or inconsistent
makes the whole breakdown unavailable
rather than half-filled. Half-true is worse than withheld.
inconsistent breakdown is unavailable for the same reason a partial one is: half-true is worse
than withheld, and the countless form is already the documented fallback.
<!-- vpmodule:atom:end report-the-breakdown-only-when-it-is-complete -->
<!-- vpmodule:atom:begin take-the-severity-from-the-reviewer-first -->
---
instruction_id: take-the-severity-from-the-reviewer-first
title: Take the severity from the reviewer first
summary: "The severity of a finding is the one the reviewer stated, and only then a recorded value or an inference."
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: "A finding's severity is being recorded or carried forward."
conditions_does_not_apply_when: The severity was never stated by anyone and cannot be inferred.
artifact_contract_output_type: finding-ledger
artifact_contract_required_data:
  - the finding
  - its severity
  - where the severity came from
artifact_contract_verified_by: "the severity comes from the reviewer's own statement of it before any inference"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Take the severity from the reviewer first
SEVERITY COMES FROM THE SECTION FIRST, the recorded ledger value second, the id prefix third
The section heading is the reviewer's OWN statement of a finding's severity
an unrecognized ## section falls back to the prefix
The Severity column is the whole basis for triaging the ledger, so it has to agree with the document it describes.
SEVERITY, READ BACK.
<!-- vpmodule:atom:end take-the-severity-from-the-reviewer-first -->