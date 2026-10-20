---
instruction_id: check-the-rewrite-against-the-old-version
title: Check the rewrite against the old version
summary: "The rewritten file is walked against the old one sentence by sentence, and every rule the rewrite lost is restored in the shortest sentence that states it."
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
  - code-minimization
conditions_applies_when: A file has been rewritten to be shorter or leaner.
conditions_does_not_apply_when: The file was not rewritten.
artifact_contract_output_type: loss-report
artifact_contract_required_data:
  - the sentences lost
  - the action a model would take without them
  - the wording whose meaning changed
  - the passages that fewer words would say as well
artifact_contract_verified_by: "every loss listed against the action test is restored, and every changed meaning is settled"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/cut-roles.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/cut.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ship.md
status: active
revision: 1
---

# Check the rewrite against the old version
Walk the old file sentence by sentence. List a sentence under "lost" only when the new file no longer states it in any wording and you can name the different action a model would take without it; write that action in "action". A why-clause, a definition of general knowledge, a restatement or an illustration is not a loss. A protected passage not kept word for word is a loss whatever the action. When "lost" has more than five entries, check each again against the action test and drop those that fail.
Separately list where the new wording changes what a rule says or contradicts a decision ("changed_meaning"), and up to five passages that fewer words would still say as well, each with its shorter wording ("remaining_fat"). Edit nothing.
Restore each loss and meaning change it lists as the shortest sentence that states it.
