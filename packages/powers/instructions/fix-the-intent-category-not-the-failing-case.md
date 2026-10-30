---
instruction_id: fix-the-intent-category-not-the-failing-case
title: "Fix the intent category, not the failing case"
summary: Read each finding as a representative of an intent category and fix the category; a patch that special-cases one input passes the case and leaves the class broken.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A case failed and a fix is proposed for it.
conditions_does_not_apply_when: The failure is unique to that one input and needs no general rule.
artifact_contract_output_type: category-fix
artifact_contract_required_data:
  - the intent category the finding stands for
  - the change made at that level
artifact_contract_verified_by: the change names the category and not the single input that exposed it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Fix the intent category, not the failing case
The failure that ends most auto-iterate loops is fixing the example instead of the cause.
A case fails because the skill mishandled a class of input; patching the skill to special-case that one input passes the case and leaves the class broken, and often the patch is a hardcoded branch that makes the skill worse.
Read each finding as a representative of an intent category and fix the category.
Address the cause the finding names rather than the single case that exposed it
