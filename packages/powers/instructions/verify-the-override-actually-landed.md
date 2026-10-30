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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/customization.md
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
