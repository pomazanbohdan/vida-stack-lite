---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-customize-skill-md-65778b65-c02"
title: "bmad-method: skills/bmad-customize/SKILL.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-customize/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-customize/SKILL.md\"}"
atom_ids:
  - state-when-the-customization-is-done
  - verify-the-override-actually-landed
atom_count: 2
atoms: "[{\"atom_id\":\"state-when-the-customization-is-done\",\"file_sha256\":\"e9d43578b53122fda609cdc1cf5e9b7451228d0312aa40bc7e889e221aeee7b7\",\"content_sha256\":\"b35323bc06f43e678bf5da13cf71d92fc6841668c08c1947025b9693042019d7\",\"file_bytes\":1390,\"body_bytes\":300},{\"atom_id\":\"verify-the-override-actually-landed\",\"file_sha256\":\"be606bdec0bec0923c89f926fe111c8743a5683bcc5bff4fea1fe5359432a595\",\"content_sha256\":\"d4bbd7f19029471195561ab756b89a7ab78856e3bf4299f290c27ce65eaacc57\",\"file_bytes\":1815,\"body_bytes\":513}]"
carrier_sha256: 0e6f2f73fd73c1e95224840c290fc45abbf8fd7a0eaa9c43671bf18f4f1ff099
carrier_bytes: 3462
revision: 1
status: active
---
<!-- vpmodule:atom:begin state-when-the-customization-is-done -->
---
instruction_id: state-when-the-customization-is-done
title: State when the customization is done
summary: "The customization is done when the file is written, the merged output has been seen and the summary has been acknowledged."
capability_tags:
  - write-configuration-override
pattern_tags:
  - completion-criteria
conditions_applies_when: A customization run reaches its end.
conditions_does_not_apply_when: The customization was aborted on purpose.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the written override file
  - the merged output shown to the user
  - the acknowledged summary
artifact_contract_verified_by: "all three conditions hold, or the exit is declared incomplete"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# State when the customization is done
Complete when:
- Override file written (or user explicitly aborted).
- User has seen resolver output (or manual fallback merge summary).
- User has acknowledged the summary.
Otherwise the skill isn't done — finish or tell the user they're exiting incomplete.
<!-- vpmodule:atom:end state-when-the-customization-is-done -->
<!-- vpmodule:atom:begin verify-the-override-actually-landed -->
---
instruction_id: verify-the-override-actually-landed
title: Verify the override actually landed
summary: "The merged output is shown after the write, and an override that did not land is traced to the file that was not picked up, the field that does not exist, the wrong merge mode or the wrong scope."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An override file has been written.
conditions_does_not_apply_when: No override file was written.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the merged output
  - the changed fields
  - the check that found the missing override
artifact_contract_verified_by: "the merged output shows the changed fields, and a missing override is corrected before the work ends"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify the override actually landed
Show the merged output, point out the changed fields.
Verify shows override didn't land (field unchanged, merge conflict, file not picked up)
Usually wrong field name, wrong merge mode (scalar vs array), or wrong scope.
- Resolver missing or fails
  apply base → team → user with the same merge rules
The TOML parses. The resolver errors and names a broken file.
The shape matches, and a replaced item uses the same `code` or `id`.
No user file overrides the team value.
<!-- vpmodule:atom:end verify-the-override-actually-landed -->