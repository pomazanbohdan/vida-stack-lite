---
instruction_id: admit-a-pitfall-only-on-observed-evidence
title: Admit a pitfall only on observed evidence
summary: "A pitfall is written only after the mistake it warns about actually happened; a surprising scan finding is a question, not a line."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A pitfall is being added to the instructions of a repository.
conditions_does_not_apply_when: The mistake is already recorded and its evidence is on file.
artifact_contract_output_type: pitfall-line
artifact_contract_required_data:
  - the observed mistake
  - the evidence
  - the line
artifact_contract_verified_by: the pitfall names a mistake that has actually occurred
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Admit a pitfall only on observed evidence
Pitfalls with observed evidence — a recorded lesson, the maintainer's recollection, the same mistake fixed repeatedly in history, or one this session made and caught.
A repo yields hundreds of trap-looking facts and none of them predict real mistakes; only observed behavior does.
A surprising scan finding is a question to ask, not a line to write.
Capture one observed agent mistake as it happens — the only admissible source for a pitfall.
One occurrence is noted; a recurring or costly mistake earns a line now
