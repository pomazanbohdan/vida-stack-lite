---
instruction_id: keep-the-plans-after-the-work-is-done
title: Keep the plans after the work is done
summary: "The plan of a delivered item is live state and historical evidence: keep it beside its entry, because deleting it turns a completed entry back into planned work."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: Work has been delivered and its records are about to be cleaned up.
conditions_does_not_apply_when: The records were never written.
artifact_contract_output_type: work-record
artifact_contract_required_data:
  - the plan
  - the status it carries
  - the evidence it holds
artifact_contract_verified_by: the completed entries still read as completed after the work is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/artifact-lifetime.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/ticketing-and-epics.md
status: active
revision: 1
---

# Keep the plans after the work is done
Joined plans are live ticket state, including after work is done.
Keep them beside their entries or backlog leaves.
They preserve status, baseline revisions, implementation evidence, and review findings for later work and retrospective.
Plans own status and baseline evidence and stay local on every store.
Keep completed plans as live state and historical evidence.
Deleting plans can turn completed entries back into planned work.
