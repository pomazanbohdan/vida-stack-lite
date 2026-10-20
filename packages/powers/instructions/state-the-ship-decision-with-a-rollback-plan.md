---
instruction_id: state-the-ship-decision-with-a-rollback-plan
title: State the ship decision with a rollback plan
summary: "The specialist reports are merged into one go/no-go decision with blockers, recommended fixes, acknowledged risks and a mandatory rollback plan; a critical finding makes the default verdict NO-GO."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The reports of the pre-ship checks are in and a go/no-go decision is due.
conditions_does_not_apply_when: The change is not going to production.
artifact_contract_output_type: ship-decision
artifact_contract_required_data:
  - the verdict
  - the blockers
  - the recommended fixes
  - the acknowledged risks
  - the rollback plan
artifact_contract_verified_by: "a GO carries a rollback plan with trigger conditions, procedure and recovery time objective"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/ship.md
status: active
revision: 1
---

# State the ship decision with a rollback plan
The rollback plan is mandatory before any GO decision.
If any persona returns a Critical finding, the default verdict is NO-GO unless the user explicitly accepts the risk.
Produce a single output:

## Ship Decision: GO | NO-GO

### Blockers (must fix before ship)
- [Source persona: Critical finding + file:line]

### Recommended fixes (should fix before ship)
- [Source persona: Important finding + file:line]

### Acknowledged risks (shipping anyway)
- [Risk + mitigation]

### Rollback plan
- Trigger conditions: [what signals would prompt rollback]
- Rollback procedure: [exact steps]
- Recovery time objective: [target]

### Specialist reports (full)
- [each specialist report]

1. **Code Quality** — Aggregate Critical/Required findings from
the code review
and any failing tests, lint, or build output. Resolve duplicates between reviewers.
2. **Security** — Promote any Critical/High
security findings to launch blockers.
Cross-reference with
the code review's security axis.
3. **Performance** — Pull from
the code review's
performance axis; cross-check Core Web Vitals if applicable.
