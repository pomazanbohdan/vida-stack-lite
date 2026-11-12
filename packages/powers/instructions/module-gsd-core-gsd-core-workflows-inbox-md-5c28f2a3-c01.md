---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-inbox-md-5c28f2a3-c01"
title: "gsd-core: gsd-core/workflows/inbox.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/inbox.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/inbox.md\"}"
atom_ids:
  - flag-what-you-cannot-classify-for-manual-triage
  - put-the-weakest-items-first
  - report-a-bypassed-precondition-as-the-top-finding
  - score-each-submission-against-the-required-fields
atom_count: 4
atoms: "[{\"atom_id\":\"flag-what-you-cannot-classify-for-manual-triage\",\"file_sha256\":\"b1a98893d8603c2dd7fc6218ca26c8ffc26c8d5f990272a6ccaef89ebfabfd00\",\"content_sha256\":\"457c9cff733cf8ae8003a3381e8427cf592c998ae8da5a01dd5f91632dfbc52d\",\"file_bytes\":1217,\"body_bytes\":192},{\"atom_id\":\"put-the-weakest-items-first\",\"file_sha256\":\"912d3dbdf6402da5a5ddca184c57e2f5dd35d798bdb36fa6d8e308dccbd850a2\",\"content_sha256\":\"e44103d150774430aff2380dad40a725f9a875510c674fff0d5087dde7e83dc9\",\"file_bytes\":1354,\"body_bytes\":261},{\"atom_id\":\"report-a-bypassed-precondition-as-the-top-finding\",\"file_sha256\":\"7394678b8aad4da706907a3b673c89013618a6f510594e5d23996cf94bedb3f3\",\"content_sha256\":\"4aed329e372cca2967cdf0f570e3425cae190114efd874de645d8c398784066b\",\"file_bytes\":1335,\"body_bytes\":226},{\"atom_id\":\"score-each-submission-against-the-required-fields\",\"file_sha256\":\"cd49a4f9b0cf87b956624c807b1d4b264ea5a3df44eb3bf5a145d48cfe6e99b4\",\"content_sha256\":\"0131f11b55d139eaedc3a457fb064a9e4773ff586e8fdf492cdfd680572b4099\",\"file_bytes\":1311,\"body_bytes\":245}]"
carrier_sha256: aa07eab8a8ae8a8de4085098c0d15c20566071f2f70696cfda5533fb3e5a1be1
carrier_bytes: 5792
revision: 1
status: active
---
<!-- vpmodule:atom:begin flag-what-you-cannot-classify-for-manual-triage -->
---
instruction_id: flag-what-you-cannot-classify-for-manual-triage
title: Flag what you cannot classify for manual triage
summary: "An item that cannot be classified is flagged for a human instead of being guessed at, and the count of the unclassified is reported."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Incoming items are classified by type.
conditions_does_not_apply_when: Every item carries an unambiguous type.
artifact_contract_output_type: triage-flags
artifact_contract_required_data:
  - the items flagged for a human
  - the count of the unclassified
artifact_contract_verified_by: nothing unclassifiable is silently classified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Flag what you cannot classify for manual triage
No matching label | Unknown | Flag for manual triage
Cannot determine: flag it.
Report the unclassified count.
Unclassifiable is not dropped.
<!-- vpmodule:atom:end flag-what-you-cannot-classify-for-manual-triage -->
<!-- vpmodule:atom:begin put-the-weakest-items-first -->
---
instruction_id: put-the-weakest-items-first
title: Put the weakest items first
summary: "The list of submissions that still need work is ordered by completeness, lowest first, and each row says what is missing."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report lists several submissions that still need work.
conditions_does_not_apply_when: "The report lists one submission, or the order carries another meaning."
artifact_contract_output_type: ranked-item-list
artifact_contract_required_data:
  - the items ordered by completeness
  - the score of each
  - what each one is missing
artifact_contract_verified_by: the list is ordered lowest completeness first and names what each item is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Put the weakest items first
For each issue sorted by completeness score, lowest first:
For each PR sorted by completeness score, lowest first:
Score: [percentage]% complete
Missing: {list of missing required fields}
Missing: {list of missing checklist items}
<!-- vpmodule:atom:end put-the-weakest-items-first -->
<!-- vpmodule:atom:begin report-a-bypassed-precondition-as-the-top-finding -->
---
instruction_id: report-a-bypassed-precondition-as-the-top-finding
title: Report a bypassed precondition as the top finding
summary: "An artefact that skipped the precondition it needed is cross-referenced and reported as the most important finding, not as a note among others."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The artefacts under review have preconditions that can be checked.
conditions_does_not_apply_when: Nothing under review has a precondition.
artifact_contract_output_type: precondition-report
artifact_contract_required_data:
  - the artefacts that skipped a precondition
  - the precondition each one needed
artifact_contract_verified_by: the bypassed precondition is the first thing reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report a bypassed precondition as the top finding
Cross-reference issues and PRs to enforce the issue-first rule:
Report gate violations prominently - these are the most important findings
A missing approval is a violation.
<!-- vpmodule:atom:end report-a-bypassed-precondition-as-the-top-finding -->
<!-- vpmodule:atom:begin score-each-submission-against-the-required-fields -->
---
instruction_id: score-each-submission-against-the-required-fields
title: Score each submission against the required fields
summary: Every submission is checked against the fields its template requires and is reported with a completeness score and the list of the missing fields.
capability_tags:
  - triage-reports
pattern_tags:
  - output-formatting
conditions_applies_when: Incoming submissions are checked against a template.
conditions_does_not_apply_when: There are no submissions to check.
artifact_contract_output_type: completeness-report
artifact_contract_required_data:
  - the score of each submission
  - the missing required fields
artifact_contract_verified_by: every submission carries its score and its missing fields
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Score each submission against the required fields
For each classified issue, review against its template requirements.
Count required fields present vs. total required fields
Score = (present / total) * 100
Report the missing required fields.
<!-- vpmodule:atom:end score-each-submission-against-the-required-fields -->