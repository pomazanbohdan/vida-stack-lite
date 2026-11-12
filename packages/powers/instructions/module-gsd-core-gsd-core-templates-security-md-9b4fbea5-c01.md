---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-security-md-9b4fbea5-c01"
title: "gsd-core: gsd-core/templates/SECURITY.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/SECURITY.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/SECURITY.md\"}"
atom_ids:
  - give-every-threat-a-disposition
  - log-accepted-risks-so-they-do-not-resurface
atom_count: 2
atoms: "[{\"atom_id\":\"give-every-threat-a-disposition\",\"file_sha256\":\"4cb796bf06c8e8324656fad586cabc0a880d55c3e4f5ff36644323fa6d38c6e9\",\"content_sha256\":\"93ad8aa3be481c4238fd7fa8125b345be7769b66374d78d5dbbe9301cbbc079f\",\"file_bytes\":1202,\"body_bytes\":200},{\"atom_id\":\"log-accepted-risks-so-they-do-not-resurface\",\"file_sha256\":\"1b901d703730f42d5fb018f40270e00623bc4c97c7b22325aa358295a61116ac\",\"content_sha256\":\"f673fec7b42b9041241ec7f1b0e6be65bd9fe08fce44351fddf35100d7e3b14d\",\"file_bytes\":1197,\"body_bytes\":164}]"
carrier_sha256: 6830b386f19f54e68e55d56d735d33db2ece777a16e84baefe9302e72b839689
carrier_bytes: 2662
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-threat-a-disposition -->
---
instruction_id: give-every-threat-a-disposition
title: Give every threat a disposition
summary: "Each threat is mitigated, accepted or transferred; a threat without a disposition cannot be closed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A threat register is written or reviewed.
conditions_does_not_apply_when: The threat was already closed.
artifact_contract_output_type: threat-disposition
artifact_contract_required_data:
  - the threat
  - the disposition
  - the control that implements it
artifact_contract_verified_by: every threat carries a disposition and the control that implements it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give every threat a disposition
All threats have a disposition (mitigate / accept / transfer)
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*
<!-- vpmodule:atom:end give-every-threat-a-disposition -->
<!-- vpmodule:atom:begin log-accepted-risks-so-they-do-not-resurface -->
---
instruction_id: log-accepted-risks-so-they-do-not-resurface
title: Log the accepted risks so they do not resurface
summary: "An accepted risk is logged with its rationale and who accepted it, and it does not come back in the next audit."
capability_tags:
  - harden-security-controls
pattern_tags:
  - decision-trail
conditions_applies_when: A threat is accepted rather than mitigated.
conditions_does_not_apply_when: The threat is being mitigated.
artifact_contract_output_type: accepted-risk-log
artifact_contract_required_data:
  - the risk
  - the rationale
  - the acceptor
  - the date
artifact_contract_verified_by: "the accepted risk is logged with a rationale, an acceptor and a date"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Log the accepted risks so they do not resurface
*Accepted risks do not resurface in future audit runs.*
| Risk ID | Threat Ref | Rationale | Accepted By | Date |
<!-- vpmodule:atom:end log-accepted-risks-so-they-do-not-resurface -->