---
instruction_id: write-a-minimum-viable-runbook
title: Write a minimum viable runbook
summary: "The runbook answers what is happening, what to check first and who to call, in three lines."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: "An alert needs a runbook, or an existing runbook has grown too long."
conditions_does_not_apply_when: No alert points at the runbook.
artifact_contract_output_type: runbook
artifact_contract_required_data:
  - what it means
  - the first check
  - the escalation path
artifact_contract_verified_by: the reader can act on the runbook without having to think
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write a minimum viable runbook

A runbook's job is to answer three questions without requiring the reader to think: what is happening, what to check first, and who to call if that doesn't resolve it.
Store it named after the alert.

**Minimum viable runbook (three lines):**

```markdown
# Runbook: High Error Rate on /api/tasks
**Means:** DB connection pool likely exhausted, or a bad deploy.
**First check:** `SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend';`
  — if count > pool limit, see Step 2. (Swap in the equivalent for your database.)
**Escalate to:** #db-oncall or engineering on-call rotation.
```

**When to expand beyond three lines:** add steps only when the first check alone isn't enough to decide.
A five-step runbook that covers the three most common causes is better than a twenty-step document that covers every edge case and gets skimmed.
