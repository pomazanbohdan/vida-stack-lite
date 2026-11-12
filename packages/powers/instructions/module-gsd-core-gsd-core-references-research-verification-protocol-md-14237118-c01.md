---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-research-verification-protocol-md-14237118-c01"
title: "gsd-core: gsd-core/references/research-verification-protocol.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/research-verification-protocol.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/research-verification-protocol.md\"}"
atom_ids:
  - check-every-configuration-scope-before-concluding-a-setting-is-absent
  - never-state-a-negative-claim-without-official-verification
  - run-the-pre-submission-checklist-before-the-research-goes-out
  - verify-a-negative-claim-before-you-make-it
atom_count: 4
atoms: "[{\"atom_id\":\"check-every-configuration-scope-before-concluding-a-setting-is-absent\",\"file_sha256\":\"5171b98f230d49c0eb36b20e123857bf40804d002f8420edd6d4dc802e34c57b\",\"content_sha256\":\"197efaf27a34b5d9aabce3ef8c0c1f009417fd6f31eb8a62be4d79e5e8725e79\",\"file_bytes\":1410,\"body_bytes\":228},{\"atom_id\":\"never-state-a-negative-claim-without-official-verification\",\"file_sha256\":\"958d971c46e82865300f50da30e26a205722e6d26592a2e22096db1aa19c46b0\",\"content_sha256\":\"0a600a9a7bf22d1fa68682e81eb642af703ebdbc2cbba72177d11f3b448c3ac9\",\"file_bytes\":1377,\"body_bytes\":290},{\"atom_id\":\"run-the-pre-submission-checklist-before-the-research-goes-out\",\"file_sha256\":\"7fc1820e162bccfc3c69574a42dc38e5dfa3528a7f535a396452f6c9fbba214f\",\"content_sha256\":\"976bdcbb1b1a88547636a53410e0211d743065bd70af1cb7a14f45f0c207ec3d\",\"file_bytes\":1676,\"body_bytes\":431},{\"atom_id\":\"verify-a-negative-claim-before-you-make-it\",\"file_sha256\":\"6b71c12def678c9a869643c447923059a7334c78ea05aa5797933241d9eef217\",\"content_sha256\":\"69762ec4de2de850a624ae650321b56889a8fc3a99e1b5f0f5a9eadbcac07ede\",\"file_bytes\":1484,\"body_bytes\":298}]"
carrier_sha256: 730d905f88e79f4a2ca6dd73f91b3c42774050ff30be7425afe5a017b40863f5
carrier_bytes: 6638
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-every-configuration-scope-before-concluding-a-setting-is-absent -->
---
instruction_id: check-every-configuration-scope-before-concluding-a-setting-is-absent
title: Check every configuration scope before concluding a setting is absent
summary: "A global setting does not mean there is no project-scoped one, so every configuration scope is checked before a setting is declared missing."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - source-hierarchy
conditions_applies_when: A configuration value is looked for and not found in one place.
conditions_does_not_apply_when: The scope of the setting is known and only one place can hold it.
artifact_contract_output_type: scope-check
artifact_contract_required_data:
  - the scopes that were checked
  - the scope the value was found in
artifact_contract_verified_by: every scope was checked before the setting was declared absent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check every configuration scope before concluding a setting is absent
**Trap:** Assuming global configuration means no project-scoping exists
**Prevention:** Verify ALL configuration scopes (global, project, local, workspace)
<!-- vpmodule:atom:end check-every-configuration-scope-before-concluding-a-setting-is-absent -->
<!-- vpmodule:atom:begin never-state-a-negative-claim-without-official-verification -->
---
instruction_id: never-state-a-negative-claim-without-official-verification
title: Never state a negative claim without official verification
summary: A claim that something is not possible is only made after the official sources have been checked.
capability_tags:
  - research-primary-sources
pattern_tags:
  - empty-result-policy
conditions_applies_when: A claim says that something does not exist or cannot be done.
conditions_does_not_apply_when: The claim says what does exist.
artifact_contract_output_type: verified-negative-claim
artifact_contract_required_data:
  - the negative claim
  - the official source that checked it
artifact_contract_verified_by: the negative claim names the official source that was checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Never state a negative claim without official verification
Making definitive "X is not possible" statements without official verification
For any negative claim — is it verified by official docs? Have you checked recent updates? Are you confusing "didn't find it" with "doesn't exist"?
<!-- vpmodule:atom:end never-state-a-negative-claim-without-official-verification -->
<!-- vpmodule:atom:begin run-the-pre-submission-checklist-before-the-research-goes-out -->
---
instruction_id: run-the-pre-submission-checklist-before-the-research-goes-out
title: Run the pre-submission checklist before the research goes out
summary: "The research pack leaves with a checklist behind it: every domain investigated, the negative claims verified, the critical claims cross-referenced, the sources dated, the confidence honest and the gaps named."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A research pack is about to be handed over.
conditions_does_not_apply_when: The pack is a partial note and not meant to be handed over.
artifact_contract_output_type: research-checklist
artifact_contract_required_data:
  - the checked item
  - the confidence assigned
  - what might have been missed
artifact_contract_verified_by: every item of the checklist is answered and the missed-questions review is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Run the pre-submission checklist before the research goes out
- [ ] All research domains in this agent's scope investigated
- [ ] Negative claims verified with official docs
- [ ] Multiple sources cross-referenced for critical claims
- [ ] URLs provided for authoritative sources
- [ ] Publication dates checked (prefer recent/current)
- [ ] Confidence levels assigned honestly
- [ ] "What might I have missed?" review completed
<!-- vpmodule:atom:end run-the-pre-submission-checklist-before-the-research-goes-out -->
<!-- vpmodule:atom:begin verify-a-negative-claim-before-you-make-it -->
---
instruction_id: verify-a-negative-claim-before-you-make-it
title: Verify a negative claim before you make it
summary: "A definitive statement that something is not possible needs the same evidence as a positive one, because not finding it is not the same as it not existing."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A negative claim about what a technology can do is about to be written.
conditions_does_not_apply_when: The claim is about the files in front of you.
artifact_contract_output_type: verified-negative-claim
artifact_contract_required_data:
  - the negative claim
  - the official source that confirms or refutes it
  - the recent updates that were checked
artifact_contract_verified_by: the negative claim names the official source that was checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Verify a negative claim before you make it
**Trap:** Making definitive "X is not possible" statements without official verification
**Prevention:** For any negative claim - is it verified by official docs? Have you checked recent updates? Are you confusing "didn't find it" with "doesn't exist"?
<!-- vpmodule:atom:end verify-a-negative-claim-before-you-make-it -->