---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-session-report-md-450ae381-c01"
title: "gsd-core: gsd-core/workflows/session-report.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/session-report.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/session-report.md\"}"
atom_ids:
  - date-the-repeated-report-so-it-does-not-overwrite
  - label-an-estimate-and-name-its-basis
atom_count: 2
atoms: "[{\"atom_id\":\"date-the-repeated-report-so-it-does-not-overwrite\",\"file_sha256\":\"5302c0c79b5ed47cc941fc80ee15263394517fc9e120fb63dd0d02a33696043a\",\"content_sha256\":\"907fe43bb5af0109b8dcb7bad07358ea0cab2168cc652b6318f4273bae68fa48\",\"file_bytes\":1162,\"body_bytes\":141},{\"atom_id\":\"label-an-estimate-and-name-its-basis\",\"file_sha256\":\"444aa09f0645fb54a05462e138ed3777a458554eb5c98a882dde061a6400def3\",\"content_sha256\":\"f36f1ebc832b6022b42c323c446e8240b1fc27589c32e1891c0bc93d45b7fffc\",\"file_bytes\":1489,\"body_bytes\":354}]"
carrier_sha256: 659c8b07e2cbfa1bac7120a5b0a7c54debce9188b2f561494c71809f80a72c04
carrier_bytes: 2936
revision: 1
status: active
---
<!-- vpmodule:atom:begin date-the-repeated-report-so-it-does-not-overwrite -->
---
instruction_id: date-the-repeated-report-so-it-does-not-overwrite
title: Date the repeated report so it does not overwrite
summary: "A report that is written again in a later session carries the date in its name, so the earlier one is still there."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A report is written more than once in the life of a project.
conditions_does_not_apply_when: The report is written once.
artifact_contract_output_type: dated-report
artifact_contract_required_data:
  - the report name
  - the date it carries
artifact_contract_verified_by: the earlier report is still readable next to the newer one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/session-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Date the repeated report so it does not overwrite
Collect session data from available sources
Filename includes date to prevent overwrites
<!-- vpmodule:atom:end date-the-repeated-report-so-it-does-not-overwrite -->
<!-- vpmodule:atom:begin label-an-estimate-and-name-its-basis -->
---
instruction_id: label-an-estimate-and-name-its-basis
title: Label an estimate and name its basis
summary: "A quantity that was not measured is presented as an estimate, and the report says which observable signals it was derived from and that it reflects the activity of the session only."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A report states a quantity that no instrument measured.
conditions_does_not_apply_when: The quantity was measured.
artifact_contract_output_type: estimated-metrics
artifact_contract_required_data:
  - the estimated values
  - the signals they were derived from
  - the note that they are estimates
artifact_contract_verified_by: the report marks the values as estimates and names their basis
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/session-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Label an estimate and name its basis
Count of tool calls is not directly available, so estimate from git activity and file operations
This is an **estimate** — exact token counts require API-level instrumentation not available to hooks
Token and cost estimates require API-level instrumentation
These metrics reflect observable session activity only
<!-- vpmodule:atom:end label-an-estimate-and-name-its-basis -->