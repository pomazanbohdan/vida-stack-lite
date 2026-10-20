---
instruction_id: resume-the-retrospective-from-the-document
title: Resume the retrospective from the document
summary: "The retrospective document is the working artifact: each phase is written into it as it finishes, and a resumed run reconciles it against the current evidence and continues at the first incomplete phase."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: "A retrospective runs, or one is resumed after an interruption."
conditions_does_not_apply_when: The run starts from nothing and the document is created for the first time.
artifact_contract_output_type: working-document
artifact_contract_required_data:
  - the document path
  - the phase each part of it records
  - the reconciliation against the current evidence
artifact_contract_verified_by: the document exists after every phase and a resumed run continues at the first incomplete phase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 1
---

# Resume the retrospective from the document
The retrospective document is the working artifact, not only the final output.
Once the epic is fixed, create it as a skeleton
and write each phase's result into it as you finish — inventory, then findings with sources, then dispositions and verdict.
Continuity is re-reading the file.
The document is the retrospective file named above, a fixed name so a resumed run finds it.
If it already exists, load it, reconcile its recorded state against the current evidence — the current evidence wins, since commits may have landed and questions may have been answered since — and resume at the first incomplete phase instead of redoing finished ones.
