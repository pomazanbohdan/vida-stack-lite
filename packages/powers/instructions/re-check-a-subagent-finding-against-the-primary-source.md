---
instruction_id: re-check-a-subagent-finding-against-the-primary-source
title: Re-check a subagent finding against the primary source
summary: A finding that came from a subagent or from the team discussion is an unverified report; the primary source is reopened before anything is routed on it.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - evidence-analysis
conditions_applies_when: A finding came from a subagent or from the team discussion and an action item would rely on it.
conditions_does_not_apply_when: The finding was established from the primary source in this run.
artifact_contract_output_type: rechecked-finding
artifact_contract_required_data:
  - the primary source that was reopened
  - the outcome of the re-check
artifact_contract_verified_by: "every routed finding rests on a primary source that was reopened, and the ones that did not hold up were dropped"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/acceptance-verdict.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Re-check a subagent finding against the primary source
Findings from sub-agents or the team discussion are unverified reports, not established facts.
Before an action item relies on one, re-check it against the primary source — reopen the file, the commit, the spec.
A finding whose source does not hold up is dropped, not routed.
