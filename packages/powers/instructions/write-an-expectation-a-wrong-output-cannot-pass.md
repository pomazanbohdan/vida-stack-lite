---
instruction_id: write-an-expectation-a-wrong-output-cannot-pass
title: Write an expectation a wrong output cannot pass
summary: "An expectation is discriminating when a wrong output cannot pass it; a weak expectation is worse than none, because a green check on it reads as proof when it is noise."
capability_tags:
  - design-experiments
pattern_tags:
  - testable-criteria
conditions_applies_when: An expectation is written for a check that grades what an output produced.
conditions_does_not_apply_when: "The check has no expectation to grade, only a count or a threshold."
artifact_contract_output_type: expectation-set
artifact_contract_required_data:
  - the expectations written
  - the weak ones removed before they ship
artifact_contract_verified_by: a clearly wrong output would fail every expectation in the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write an expectation a wrong output cannot pass
The grader's job is easier and the result is more honest when an expectation is discriminating, meaning a wrong output cannot pass it.
A weak expectation is worse than no expectation, because a green check on it reads as proof when it is noise.
The grader flags weak expectations when it sees them; write them out of the rubric before they ship.
Filename-only checks. "brief.md exists" passes for an empty file. Pair existence with a content check.
Wholly subjective phrasing. "the brief is high quality" cannot be graded. State the property concretely.
Tautologies. Anything that follows automatically from the prompt being understood proves nothing.
Specific facts that must appear, such as "incorporates at least two findings from section X."
Structural claims a wrong output would fail, such as "word count between 250 and 1500."
Negative assertions, such as "does not introduce content from unrelated sections."
Frontmatter checks, such as "frontmatter contains title, status, created (ISO 8601), updated."
Bounded output blocks, such as "the final message contains a JSON object with intent='create'."
Side-artifact existence paired with content
Phase ordering, such as "the polish call occurs after the brief Write and before the final JSON block."
Read-only enforcement, such as "the input brief.md is byte-identical to the fixture and no Write or Edit targeted it."
Bidirectional fidelity, such as "every decision in the run log is reflected in the brief, and no claim in the brief is absent from the input or the run log."
