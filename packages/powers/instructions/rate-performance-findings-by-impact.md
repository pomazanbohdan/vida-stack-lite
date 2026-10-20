---
instruction_id: rate-performance-findings-by-impact
title: Rate a performance finding by its impact
summary: Rate a performance finding by what it does to a Core Web Vital or to the loading path.
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A performance finding needs a severity and an action.
conditions_does_not_apply_when: The finding is already rated against a fixed severity scale.
artifact_contract_output_type: rated-performance-finding
artifact_contract_required_data:
  - severity
  - criteria met
  - action
artifact_contract_verified_by: the severity matches the stated criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/web-performance-auditor.md
status: active
revision: 2
---

# Rate a performance finding by its impact
| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Directly causes a Core Web Vital to fail the "Good" threshold | Fix before release |
| **Important** | Likely degrades a CWV or causes significant loading/interaction slowdown | Fix before release |
| **Important** | Suboptimal pattern with measurable but contained impact | Fix in current sprint |
| **Minor** | Best practice gap with minor or speculative impact | Schedule for next sprint |
| **Minor** | Improvement opportunity with no current evidence of impact | Consider adopting |
