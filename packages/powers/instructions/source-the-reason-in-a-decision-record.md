---
instruction_id: source-the-reason-in-a-decision-record
title: Source the reason in a decision record
summary: "A decision record is proposed only for a decision that is hard to reverse, surprising without context and the result of a real trade-off, and its reason comes from the plan, the commit or the session log — or the record says that none of them gives it."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A decision taken during the work is considered for a decision record.
conditions_does_not_apply_when: "The decision is easy to reverse, unsurprising, or had no real alternative."
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - the context
  - the decision
  - the why and where the why comes from
  - whether the person approved it and which file was written
artifact_contract_verified_by: "the record names the plan and the commit it came from, and it says so when no source gives the why"
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
  - operations
---

# Source the reason in a decision record
Propose a decision
as a decision record (ADR) when it is hard to reverse, surprising without context, and the result of a real trade-off
A record is one file:
its name and title stating the decision
its body one paragraph (context, decision, why) naming the plan and the commit
the why comes from the plan, the commit or a session log, and when none gives it the record says so, since a reason the retrospective supplies is later read as the team's.
It goes beside the code it governs, or in the repository's decisions folder (else `docs/decisions/`) when it is system-wide.
Ask the user about each in interactive runs and write only the approved ones; a headless run only proposes; committing them is the user's concern.
Planning documents are not ADRs.
