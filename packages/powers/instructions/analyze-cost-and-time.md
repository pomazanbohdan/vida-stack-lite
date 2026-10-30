---
instruction_id: analyze-cost-and-time
title: Account for cost and time from the records
summary: "Compute token and wall-clock totals from the recorded counters and timestamps, and name what dominates them without guessing why."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "The complaint concerns duration, cost, or excessive spending."
conditions_does_not_apply_when: The artifact has no records of cost or time.
artifact_contract_output_type: cost-and-time-report
artifact_contract_required_data:
  - totals
  - largest turns
  - longest gaps
  - unsupported fields
artifact_contract_verified_by: totals computed from recorded counters
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/cost-and-time.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Account for cost and time from the records
Account for where tokens and wall-clock went.
Use only the usage records and counter meanings established in the case file.
State whether each counter is incremental or cumulative before calculating totals.
Difference cumulative observations without turning a missing observation into zero.
Report the five turns with the largest supported totals and the supported totals per associated session.
Use the evidenced timestamp fields, event boundaries, and units recorded in the case file.
Report the five longest supported turns and any gap longer than ten minutes between consecutive events.
Say which only when the records show it — idle, waiting on an associated session, or waiting on your human partner.
Use the case file's evidenced tool-result records to report the ten largest results with their tool and turn.
Measure records before extracting bounded content.
Count and locate records whose meaning as compaction events was established during discovery.
Report available before/after counters and what the session was doing when each fired; mark unsupported fields absent.
Count associated sessions and report supported usage, duration, and dispatching turn for each.
Report the turns, subagents, tools, or repeats that dominate the totals, with numbers.
Do not speculate about why a turn was expensive beyond what the transcript shows.
