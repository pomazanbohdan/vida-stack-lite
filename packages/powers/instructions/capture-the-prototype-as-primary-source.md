---
instruction_id: capture-the-prototype-as-primary-source
title: Capture the prototype as a primary source
summary: "Fold a validated prototype decision into the real code and keep the prototype itself as a primary source on a throwaway branch, pointed at from the work item."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A prototype has answered its question.
conditions_does_not_apply_when: The prototype is discarded without capturing its answer.
artifact_contract_output_type: captured-prototype
artifact_contract_required_data:
  - folded decision
  - prototype branch
  - context pointer
artifact_contract_verified_by: the decision lives in the real code and the prototype survives on a throwaway branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/prototype/SKILL.md
status: active
revision: 1
---

# Capture the prototype as a primary source
Fold any validated decision into the real code, then capture the prototype itself as a **primary source**: commit it to a throwaway branch, out of main, and leave a context pointer to that branch on the implementation issue. Capture the answer too (the verdict and the question it settled) in the issue or a commit. The main branch keeps only the validated decision.
For a logic prototype: the validated reducer / machine / function set lifts into the real module (the decision, absorbed); the HTML shell rides along to the throwaway branch that keeps the prototype as a primary source, and being one self-contained file, it stays trivially re-runnable there.
For a UI prototype: fold the winner into the existing page and move the rest onto the throwaway branch, not into main.
