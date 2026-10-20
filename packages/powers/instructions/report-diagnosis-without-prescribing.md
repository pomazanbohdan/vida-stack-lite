---
instruction_id: report-diagnosis-without-prescribing
title: Report the evidence without prescribing a fix
summary: "State what happened with citations and confidence, name what could not be verified, and leave the change decision to the triager."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The analysis is complete and its results must be delivered.
conditions_does_not_apply_when: The report does not yet have supported findings.
artifact_contract_output_type: diagnosis-report
artifact_contract_required_data:
  - statement
  - environment
  - timeline
  - findings
  - limitations
artifact_contract_verified_by: every claim cites evidence and confidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 2
---

# Report the evidence without prescribing a fix
You report; you do not diagnose the product.
Whoever triages the bundle or the issue decides whether the product changes.
Fill every section of the report template in order.
Write it to the workspace, show it, and give the path.
Check what cited content actually proves and preserve the supporting case.
A symlink alias is not a redundant copy.
Report §7 states involvement and stops.
Never name a defect in a skill or propose a change.
Your partner pressing for a fix does not waive this.
Point at the issue step and mention that a bundle is available on request.
No advice to your partner either.
Numbers you did not compute from the transcript are invented. Cite or drop.
Approval gates: no issue or comment before they approve the exact text.
Do not attribute intent to the implementer.
