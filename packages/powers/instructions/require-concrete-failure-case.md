---
instruction_id: require-concrete-failure-case
title: Require a concrete case for every finding
summary: "A finding without an input or situation that leads to a wrong result does not enter the report: the claim is verified at the cited location before it is graded."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "You are about to report a finding, or about to grade one a reviewer raised."
conditions_does_not_apply_when: You are only describing the review method.
artifact_contract_output_type: verified-finding
artifact_contract_required_data:
  - case
  - location in code
  - confirmation
  - rejected findings
artifact_contract_verified_by: "no finding is reported without a concrete failure case, and the claim was verified at the cited location"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 3
---

# Require a concrete case for every finding
Every finding needs a concrete case: "this input or situation leads to this wrong result".
No case, no finding.
Re-read the lines and confirm: the caller exists, the value can really be empty, the code really is unused.
Verify the finding's claim. At the cited file and line, does the bad outcome the reviewer describes actually occur?
Read beyond the changed lines -- follow callers, guards upstream, etc -- until you can answer yes or no.
A different finding about nearby code does not settle this one.
Judge whether the problem is real, not whether the proposed fix is plausible.
Code that loudly fails on a situation you never showed the program can reach is correct behavior, not a defect.
Be specific: a file and line, not a vague area.
No style taste, no "consider", no vague worries.
Do not be vague.
Do not give feedback on code you did not actually read.
