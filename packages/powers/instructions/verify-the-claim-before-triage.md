---
instruction_id: verify-the-claim-before-triage
title: Verify the claim before triage
summary: "Verify a reported claim before grilling it: reproduce a bug from the reporter's steps, or run the relevant tests for a change."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A report's claim drives the triage decision."
conditions_does_not_apply_when: The claim is already confirmed.
artifact_contract_output_type: verification-result
artifact_contract_required_data:
  - reproduction
  - confirmed or failed
  - code path
artifact_contract_verified_by: "the outcome is confirmed, failed, or insufficient detail"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/triage/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-forge-idea/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/agents/triage-labels.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify the claim before triage
Before any grilling, check that the claim holds up. For a bug, reproduce it from the reporter's steps. For a PR, confirm the diff does what it claims: check it out, run the relevant tests or commands. Report what happened: confirmed (with code path), failed, or insufficient detail (a strong `needs-info` signal). A confirmed verification makes a much stronger agent brief.

**Verify the finding's claim.** At the cited file and line, does the bad outcome the reviewer describes actually occur? Read beyond the changed lines — follow callers, guards upstream, etc — until you can answer yes or no. A different finding about nearby code does not settle this one. Judge whether the problem is real, not whether the proposed fix is plausible. Code that loudly fails on a situation you never showed the program can reach is correct behavior, not a defect.

A gap finding from the verification-gap lens arrives pre-verified — that lens's evidence rules made it read the tests and run the searches it cites, and triage trusts the claim as filed. Skip verification, render the verdict from the filed evidence, and weigh its filed disposition when routing.
For ideas about an existing project, treat the project's files and materials as the source of truth.
Do not accept a label or summary as proof.
Find the relevant material yourself and check the user's claim against it.
If the material contradicts the user's claim, stop and resolve that before continuing.
- It means "verified reproducible bug" and is the gate the fix workflow requires before any code is written.
- be specific in triage comments about what reproduction steps or information are missing.
- If the work requires human judgment (design decisions, external access), note it in the issue body.
