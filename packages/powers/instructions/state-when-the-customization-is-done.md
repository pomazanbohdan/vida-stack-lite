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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 1
---

# State when the customization is done
Complete when:
- Override file written (or user explicitly aborted).
- User has seen resolver output (or manual fallback merge summary).
- User has acknowledged the summary.
Otherwise the skill isn't done — finish or tell the user they're exiting incomplete.
