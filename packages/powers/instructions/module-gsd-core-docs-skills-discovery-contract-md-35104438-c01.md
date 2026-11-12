---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-skills-discovery-contract-md-35104438-c01"
title: "gsd-core: docs/skills/discovery-contract.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/skills/discovery-contract.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/skills/discovery-contract.md\"}"
atom_ids:
  - identify-a-skill-by-its-manifest-not-by-its-folder
  - keep-a-deprecated-root-readable-but-not-written
atom_count: 2
atoms: "[{\"atom_id\":\"identify-a-skill-by-its-manifest-not-by-its-folder\",\"file_sha256\":\"5a7b01b6b540967b1c8d38e25579a2c5c37e16789a923d3405b0f4f3fcfe6674\",\"content_sha256\":\"718b767d4b1341360ae011faca9f4e600bd664cdf580ae16c6d0a791da07f44c\",\"file_bytes\":1345,\"body_bytes\":210},{\"atom_id\":\"keep-a-deprecated-root-readable-but-not-written\",\"file_sha256\":\"99a4f20255e956781e9a7b9fb90cb516c6f23f9d87dd57276aadade23a84cd97\",\"content_sha256\":\"260bd3c3787e3d208b078adb34818c6f4d11c9136ef6d726b40909ab5740aa84\",\"file_bytes\":1372,\"body_bytes\":262}]"
carrier_sha256: e9ebf3fbcd3dbcaa91718105f179afc267446452862c938db005743a31fe37bb
carrier_bytes: 3026
revision: 1
status: active
---
<!-- vpmodule:atom:begin identify-a-skill-by-its-manifest-not-by-its-folder -->
---
instruction_id: identify-a-skill-by-its-manifest-not-by-its-folder
title: "Identify a skill by its manifest, not by its folder"
summary: "A skill is identified by the manifest in its directory, and the directory name is the fallback when the manifest carries no name."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - verified-loading
conditions_applies_when: A set of skill directories is being inventoried.
conditions_does_not_apply_when: The directories have no manifests at all.
artifact_contract_output_type: skill-identity
artifact_contract_required_data:
  - the manifest that identifies the skill
  - the fallback name
  - the directories that are scanned
artifact_contract_verified_by: every skill was identified from its manifest with the directory name as the fallback
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/skills/discovery-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Identify a skill by its manifest, not by its folder
- Scan only subdirectories that contain `SKILL.md`.
- Read `name` and `description` from YAML frontmatter.
- Use the directory name when `name` is missing.
<!-- vpmodule:atom:end identify-a-skill-by-its-manifest-not-by-its-folder -->
<!-- vpmodule:atom:begin keep-a-deprecated-root-readable-but-not-written -->
---
instruction_id: keep-a-deprecated-root-readable-but-not-written
title: Keep a deprecated root readable but not written
summary: "A root that is kept only for legacy migration is still reported by the inventory, but nothing new is written there."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A legacy root is still present and the inventory runs.
conditions_does_not_apply_when: The root is being removed and nothing references it.
artifact_contract_output_type: deprecated-root
artifact_contract_required_data:
  - the legacy root
  - what the inventory reports
  - what is never written there
artifact_contract_verified_by: the legacy root was reported and nothing was written to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/skills/discovery-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a deprecated root readable but not written
- This root is kept for legacy migration only. Inventory code may report it, but new installs should not write here.
- Discovery code only checks whether it exists so inventory can report legacy Claude installs.
<!-- vpmodule:atom:end keep-a-deprecated-root-readable-but-not-written -->