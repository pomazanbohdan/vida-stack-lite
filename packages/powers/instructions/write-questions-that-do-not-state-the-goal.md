---
instruction_id: write-questions-that-do-not-state-the-goal
title: Write questions that do not state the goal
summary: "The questions sent to the researchers name the code to look at and never the change that is being considered, so that the answer describes what is there."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research ask about a repository has to become questions.
conditions_does_not_apply_when: The questions already exist and are agreed.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the questions
  - the shape of each question
  - the parts of the code they cover
artifact_contract_verified_by: no question states the intent or names what the ask wants built
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 1
---

# Write questions that do not state the goal
Write questions that send researchers to every part of the code the ask depends on, none stating the intent or naming what the ask wants built: "how does a job run end?", not "where would cancellation go?" or "can a running job be cancelled?".
- Four shapes: `how does X work`, `why is X this way`, `where does X live`, `what touches X`.
- An ask from a ticket or goal also gets a question on how that code is tested.
