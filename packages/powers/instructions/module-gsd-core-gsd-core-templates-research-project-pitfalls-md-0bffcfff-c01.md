---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-research-project-pitfalls-md-0bffcfff-c01"
title: "gsd-core: gsd-core/templates/research-project/PITFALLS.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/templates/research-project/PITFALLS.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/research-project/PITFALLS.md\"}"
atom_ids:
  - list-the-things-that-look-done-but-are-not
  - map-each-pitfall-to-a-phase-that-prevents-it
  - name-the-early-warning-signs-for-each-pitfall
  - record-the-cost-and-the-conditions-of-a-shortcut
  - write-the-recovery-path-for-each-pitfall
atom_count: 5
atoms: "[{\"atom_id\":\"list-the-things-that-look-done-but-are-not\",\"file_sha256\":\"4a141e9386d3a5c6c211b9d5d186246011039025f63d6780b6a4afb8625f39d7\",\"content_sha256\":\"1e35c02cd665d783efb5eb8bf723e898d735bc2f7b516c8e1994f05462003129\",\"file_bytes\":1314,\"body_bytes\":229},{\"atom_id\":\"map-each-pitfall-to-a-phase-that-prevents-it\",\"file_sha256\":\"dc40374614303b52fe3a40deacd10acc841f69ebcd869b56728be5fa789d820a\",\"content_sha256\":\"201047213a629509776f4a86d7c4122ed61ba0bc05243a80a82dc614995e953e\",\"file_bytes\":1383,\"body_bytes\":217},{\"atom_id\":\"name-the-early-warning-signs-for-each-pitfall\",\"file_sha256\":\"69aceb1765d4dd9af1d759357cb428d866cc109963cea5f7a6608dc8014e4a69\",\"content_sha256\":\"bd0e5e4dea82386c1f5f0c3db15cdbb68ab783d8a53f7da1171da16aeca04644\",\"file_bytes\":1232,\"body_bytes\":183},{\"atom_id\":\"record-the-cost-and-the-conditions-of-a-shortcut\",\"file_sha256\":\"f7ee3f38aa2f6e8d3a8fb2179dfef501291cd3f7271a1ad471e8a4dc94a12844\",\"content_sha256\":\"5598e3bac6a19297f7c462f0c3b9f15a6d28f677513ca8796ffbf6fc77ac3ae0\",\"file_bytes\":1496,\"body_bytes\":283},{\"atom_id\":\"write-the-recovery-path-for-each-pitfall\",\"file_sha256\":\"dbd3b05607bedcc351f14b7157afebef4487072f338a93f8da7e73039a19a487\",\"content_sha256\":\"bbc20debddf43ef5ef6d96e288999486b0a112720d37f548257fef017b91c438\",\"file_bytes\":1155,\"body_bytes\":144}]"
carrier_sha256: 1cc4f18e2371535aeea0b326aad0176673424be366a87af8de515939254240ce
carrier_bytes: 7307
revision: 1
status: active
---
<!-- vpmodule:atom:begin list-the-things-that-look-done-but-are-not -->
---
instruction_id: list-the-things-that-look-done-but-are-not
title: List the things that look done but are not
summary: The features that appear complete but miss a critical piece are listed as a checklist for the execution.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The domain has no known false-completion traps.
artifact_contract_output_type: false-completion-checklist
artifact_contract_required_data:
  - each feature
  - the piece that is usually missing
  - the check that catches it
artifact_contract_verified_by: each listed feature names the missing piece and the check that catches it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# List the things that look done but are not
Things that appear complete but are missing critical pieces.
Checklist format for verification during execution
Common in demos vs. production
Prevents "it works on my machine" issues
<!-- vpmodule:atom:end list-the-things-that-look-done-but-are-not -->
<!-- vpmodule:atom:begin map-each-pitfall-to-a-phase-that-prevents-it -->
---
instruction_id: map-each-pitfall-to-a-phase-that-prevents-it
title: Map each pitfall to a phase that prevents it
summary: Every pitfall names the phase that has to prevent it and how the prevention is checked.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The pitfalls are not tied to phases.
artifact_contract_output_type: pitfall-phase-map
artifact_contract_required_data:
  - the pitfall
  - the phase that prevents it
  - the check that confirms it
artifact_contract_verified_by: every pitfall names a prevention phase and the check that confirms it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body maps unspecified domain pitfalls to roadmap phases but names no supported engineering, product, business, research, or operations subject."
---

# Map each pitfall to a phase that prevents it
Link to specific phases — makes pitfalls actionable
Each pitfall should map to a phase that prevents it
**Phase to address:** [Which roadmap phase should prevent this]
<!-- vpmodule:atom:end map-each-pitfall-to-a-phase-that-prevents-it -->
<!-- vpmodule:atom:begin name-the-early-warning-signs-for-each-pitfall -->
---
instruction_id: name-the-early-warning-signs-for-each-pitfall
title: Name the early warning signs for each pitfall
summary: "A recorded pitfall names how it is detected early, so the failure is caught before it turns into a problem."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A pitfall is written down.
conditions_does_not_apply_when: The failure is already known and only its fix is being written.
artifact_contract_output_type: pitfall-record
artifact_contract_required_data:
  - the warning signs that detect the pitfall early
artifact_contract_verified_by: the pitfall carries the signals that reveal it before it bites
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the early warning signs for each pitfall
Include warning signs — early detection prevents disasters
**Warning signs:** [How to detect this early before it becomes a problem]
<!-- vpmodule:atom:end name-the-early-warning-signs-for-each-pitfall -->
<!-- vpmodule:atom:begin record-the-cost-and-the-conditions-of-a-shortcut -->
---
instruction_id: record-the-cost-and-the-conditions-of-a-shortcut
title: Record the cost and the conditions of a shortcut
summary: "A recorded shortcut carries its immediate benefit, its long-term cost and the conditions under which it is acceptable."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A shortcut is written down as a known one.
conditions_does_not_apply_when: The shortcut is not being recorded for a later reader.
artifact_contract_output_type: shortcut-record
artifact_contract_required_data:
  - the immediate benefit of the shortcut
  - the long-term cost
  - the conditions under which it is acceptable
artifact_contract_verified_by: the record says what the shortcut costs and when it is allowed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body provides a shortcut trade-off table without establishing a supported domain or one of the four defined forms.
---

# Record the cost and the conditions of a shortcut
Be realistic — some shortcuts are acceptable
Note when shortcuts are "never acceptable" vs. "only in MVP"
Include the long-term cost to inform tradeoff decisions
| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
<!-- vpmodule:atom:end record-the-cost-and-the-conditions-of-a-shortcut -->
<!-- vpmodule:atom:begin write-the-recovery-path-for-each-pitfall -->
---
instruction_id: write-the-recovery-path-for-each-pitfall
title: Write the recovery path for each pitfall
summary: Each pitfall also carries the steps that recover from it and what the recovery costs.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The pitfall cannot occur in this project.
artifact_contract_output_type: recovery-path
artifact_contract_required_data:
  - the pitfall
  - the recovery steps
  - the cost of the recovery
artifact_contract_verified_by: every pitfall carries its recovery steps and its recovery cost
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the recovery path for each pitfall
When pitfalls occur despite prevention, how to recover.
| Pitfall | Recovery Cost | Recovery Steps |
<!-- vpmodule:atom:end write-the-recovery-path-for-each-pitfall -->