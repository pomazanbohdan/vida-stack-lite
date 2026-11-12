---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-research-project-summary-md-52f21d7c-c01"
title: "gsd-core: gsd-core/templates/research-project/SUMMARY.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/templates/research-project/SUMMARY.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/research-project/SUMMARY.md\"}"
atom_ids:
  - flag-the-phases-that-need-deeper-research
  - mark-source-confidence-honestly
  - write-the-executive-summary-for-a-reader-who-stops-there
atom_count: 3
atoms: "[{\"atom_id\":\"flag-the-phases-that-need-deeper-research\",\"file_sha256\":\"4431b562eada18f7ce3c0356a79960fb99fab437e20f14d3ff0ab2baf084362d\",\"content_sha256\":\"b6d2a3d9b39f7e388247e30a231cbe082728367a5c3198f1c55a840e8c462558\",\"file_bytes\":1432,\"body_bytes\":350},{\"atom_id\":\"mark-source-confidence-honestly\",\"file_sha256\":\"68455942a03603ad9736834fc700c716ee30c86815923054b3f7c054da5519b7\",\"content_sha256\":\"b30483fe6f09160db0bea089181a51028de8603755ba94ea52e9cfc1b130589b\",\"file_bytes\":1389,\"body_bytes\":203},{\"atom_id\":\"write-the-executive-summary-for-a-reader-who-stops-there\",\"file_sha256\":\"d1670ab73e5c36823a762edd6e9d1b71c8d02329a08e943e67f1dbc27a50af8a\",\"content_sha256\":\"bda21693d52a117734181dd832297871d21c97bf942f4d5bbe8eac0ffec343c9\",\"file_bytes\":1277,\"body_bytes\":177}]"
carrier_sha256: 43198c998f635d90f7c2b304d89738e8e62a92ab5a2b15741f03485b337e4095
carrier_bytes: 4527
revision: 1
status: active
---
<!-- vpmodule:atom:begin flag-the-phases-that-need-deeper-research -->
---
instruction_id: flag-the-phases-that-need-deeper-research
title: Flag the phases that need deeper research
summary: "Every suggested phase is marked with whether it needs deeper research and why, or that its patterns are standard."
capability_tags:
  - plan-implementation
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A research summary proposes a phase structure.
conditions_does_not_apply_when: No phase structure is proposed.
artifact_contract_output_type: research-flags
artifact_contract_required_data:
  - the phases that need deeper research and the reason
  - the phases whose patterns are standard
artifact_contract_verified_by: every proposed phase carries a research flag or a standard-pattern note
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/SUMMARY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Flag the phases that need deeper research
Phases likely needing deeper research during planning:
**Phase [X]:** [reason — e.g., "complex integration, needs API research"]
Phases with standard patterns (skip research-phase):
**Phase [X]:** [reason — e.g., "well-documented, established patterns"]
Include research flags for each suggested phase
<!-- vpmodule:atom:end flag-the-phases-that-need-deeper-research -->
<!-- vpmodule:atom:begin mark-source-confidence-honestly -->
---
instruction_id: mark-source-confidence-honestly
title: Mark the source confidence honestly
summary: "A finding carries the confidence of the source behind it: official sources, community consensus, or a single source."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A research finding is recorded.
conditions_does_not_apply_when: "The finding is a decision of the project, not a claim about a source."
artifact_contract_output_type: source-confidence
artifact_contract_required_data:
  - the source
  - the confidence level
  - the reason for it
artifact_contract_verified_by: every finding names its source and the confidence level it was read at
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/SUMMARY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Mark the source confidence honestly
Sources: Mark confidence levels honestly
HIGH = verified with official sources
MEDIUM = community consensus, multiple sources agree
LOW = single source or inference
<!-- vpmodule:atom:end mark-source-confidence-honestly -->
<!-- vpmodule:atom:begin write-the-executive-summary-for-a-reader-who-stops-there -->
---
instruction_id: write-the-executive-summary-for-a-reader-who-stops-there
title: Write the executive summary for a reader who stops there
summary: The summary is written for a reader who reads nothing else and carries the recommendation and the main risk.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A summary of a set of research documents is written.
conditions_does_not_apply_when: The summary is written for a reader who will read the whole set.
artifact_contract_output_type: executive-summary
artifact_contract_required_data:
  - the key recommendation
  - the main risk
artifact_contract_verified_by: the summary carries the recommendation and the main risk in two or three paragraphs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/SUMMARY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Write the executive summary for a reader who stops there
Write for someone who will only read this section
Include the key recommendation and main risk
2-3 paragraphs maximum
<!-- vpmodule:atom:end write-the-executive-summary-for-a-reader-who-stops-there -->