---
instruction_id: route-each-finding-to-an-action-and-to-a-prevention
title: Route each finding to an action and to a prevention
summary: "Every finding gets two dispositions: what happens to this instance, and what would stop the next one."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
  - code-audit
conditions_applies_when: Consolidated findings are turned into routed work.
conditions_does_not_apply_when: The findings were already routed.
artifact_contract_output_type: routed-findings
artifact_contract_required_data:
  - the disposition of this instance
  - the upstream lesson that would prevent the next one
  - the context a deferred finding carries
artifact_contract_verified_by: every finding carries both dispositions and a deferred finding carries the context it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Route each finding to an action and to a prevention
Give every finding two independent dispositions:
- **What to do about this instance** — *fix now*, *defer*, or *accept as-is*. Fix-now findings become action items. Deferred findings carry enough context to be acted on later without re-investigation. Accepted deviations are recorded so later retros stop re-flagging them.
- **What would prevent the next one** — the upstream lesson: spec wording, story sizing, a missing convention or gate, or nothing. This is where a recurring finding becomes a process change rather than a one-off fix.
Then for each failed check, add a concrete next action:
