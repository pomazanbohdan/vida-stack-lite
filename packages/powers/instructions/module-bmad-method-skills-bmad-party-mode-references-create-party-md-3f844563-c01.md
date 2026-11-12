---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-party-mode-references-create-party-md-3f844563-c01"
title: "bmad-method: skills/bmad-party-mode/references/create-party.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-party-mode/references/create-party.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-party-mode/references/create-party.md\"}"
atom_ids:
  - check-for-a-collision-before-saving-an-override
  - cluster-raw-data-by-what-differentiates-behavior
  - propose-a-first-cut-instead-of-interrogating
atom_count: 3
atoms: "[{\"atom_id\":\"check-for-a-collision-before-saving-an-override\",\"file_sha256\":\"0eceb791e36e55f7d79ec223e3c39f5b6b0622c5abae732a72ece770670ca5dd\",\"content_sha256\":\"5476d7666e2998cf705fcd6676ab9dbd4354b3ede7aabc8b6563872c89a03308\",\"file_bytes\":1538,\"body_bytes\":354},{\"atom_id\":\"cluster-raw-data-by-what-differentiates-behavior\",\"file_sha256\":\"f5d2818482c44f9b94787eb1e33b351c402dcf44e3c91ff78fe87a945a0a6e3e\",\"content_sha256\":\"14acf98fe5a571e530b3667a291799d321cb833f1701913d911a5368492c35aa\",\"file_bytes\":1897,\"body_bytes\":652},{\"atom_id\":\"propose-a-first-cut-instead-of-interrogating\",\"file_sha256\":\"e69746d47ad6deb98f3571a5577800aeb3a52037601708351fb4dbf737eeae96\",\"content_sha256\":\"d7f7160588204a30dd24fadac553f08772cc7342f9de7cd402f3d33faabdd730\",\"file_bytes\":1458,\"body_bytes\":260}]"
carrier_sha256: bb849f5cad28a46479f17e096c8fa9efa071d1311f98f9931476ecb87e8f23a0
carrier_bytes: 5344
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-for-a-collision-before-saving-an-override -->
---
instruction_id: check-for-a-collision-before-saving-an-override
title: Check for a collision before saving an override
summary: "Resolve the current set once, compare every new entry's key against it, and surface a collision instead of silently overwriting."
capability_tags:
  - check-for-name-collisions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new entry is about to be saved into a set that already holds entries with keys.
conditions_does_not_apply_when: The entry is written into a place with no existing entries under the same key.
artifact_contract_output_type: collision-check
artifact_contract_required_data:
  - the resolved set
  - the new key
  - the collision
  - the decision
artifact_contract_verified_by: a colliding key was put to the user before anything was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/create-party.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Check for a collision before saving an override
A custom member whose `code` matches an installed agent silently *overrides* that agent in the collective.
Before composing, resolve the collective once
and check each new member's `code` against the returned members.
On a collision, surface it
and let the user confirm or rename.
One check, not a gate.
<!-- vpmodule:atom:end check-for-a-collision-before-saving-an-override -->
<!-- vpmodule:atom:begin cluster-raw-data-by-what-differentiates-behavior -->
---
instruction_id: cluster-raw-data-by-what-differentiates-behavior
title: Cluster raw data by what differentiates behavior
summary: "Compress source material into representative personas by the traits that change behaviour, and say which split you used."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: "The user hands over raw material — a table, a set of profiles, exported notes — that has to become a small set of representatives."
conditions_does_not_apply_when: The material already names the groups and only has to be formatted.
artifact_contract_output_type: persona-clusters
artifact_contract_required_data:
  - the clusters
  - the traits that drove the split
  - the number of personas
  - the reasoning
artifact_contract_verified_by: the split is made on behaviour and the user is told which traits drove it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/create-party.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - research
---

# Cluster raw data by what differentiates behavior
When the user points you at data — a file path, a pasted table, exported profiles — read it and compress it into the requested number of representative personas.
Cluster by what actually differentiates behavior (goals, budget, pains, adoption posture), not surface demographics alone.
Each cluster becomes one persona with a real name and face.
Name your reasoning: tell the user which segments you found and which traits drove the split, so they can correct the cut before you flesh the personas out.
If they didn't say how many, propose a number from the spread in the data and let them adjust.
<!-- vpmodule:atom:end cluster-raw-data-by-what-differentiates-behavior -->
<!-- vpmodule:atom:begin propose-a-first-cut-instead-of-interrogating -->
---
instruction_id: propose-a-first-cut-instead-of-interrogating
title: Propose a first cut instead of interrogating
summary: "Draft the first version, let the user react, and keep pushing until each one has a detail that identifies it without its label."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "Several profiles, sections or options have to be written and the user knows what they want but not how to say it."
conditions_does_not_apply_when: The content is fully specified and only has to be written down.
artifact_contract_output_type: first-cut
artifact_contract_required_data:
  - the first cut
  - the specific detail
  - the reaction invited
artifact_contract_verified_by: the first cut was proposed for reaction and every entry carries a specific identifying detail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/create-party.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Propose a first cut instead of interrogating
Draft, don't interrogate.
Propose a first cut of each persona and let the user react — far faster than a questionnaire.
Push each one until it has a voice you could pick out blind.
Keep pushing for specificity.
<!-- vpmodule:atom:end propose-a-first-cut-instead-of-interrogating -->