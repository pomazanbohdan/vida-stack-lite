---
instruction_id: treat-every-existing-instruction-as-intentional
title: Treat every existing instruction as intentional
summary: "An instruction a human wrote is presumed intentional and the file is the baseline being improved, not raw material to be discarded."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The instructions of a repository that already hold content are being revised.
conditions_does_not_apply_when: The instruction file is empty and everything is written from scratch.
artifact_contract_output_type: baseline-reading
artifact_contract_required_data:
  - the existing instructions
  - the presumption
  - the baseline
artifact_contract_verified_by: no existing instruction is dropped as raw material
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 1
---

# Treat every existing instruction as intentional
Every instruction a human wrote is presumed intentional: someone paid for it, usually by watching an agent fail.
The file is the baseline being improved, not raw material.
Keep its phrasing where it works
