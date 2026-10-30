---
instruction_id: analyze-repeated-work
title: Find work the session did more than once
summary: "Group identical actions by tool and key, count the repetitions, and say what changed between them."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The complaint concerns repeated actions or wasted work.
conditions_does_not_apply_when: The artifact contains no repeated actions.
artifact_contract_output_type: repeated-work-report
artifact_contract_required_data:
  - action groups
  - counts
  - what changed
  - finding
artifact_contract_verified_by: groups and counts derived from recorded actions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/repeated-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Find work the session did more than once
Find work the session did more than once.
Extract every tool call as `(line, turn, tool, key)`.
The key is the file path for reads, edits, and writes; the command text for shell calls.
For subagent dispatches it is the description plus the first 80 characters of the prompt; for searches it is the query.
Strip trailing whitespace from shell commands and keep the whole command.
Group by `(tool, key)` and report the groups at or over threshold: reads and searches 3, edits 2, shell commands 2, subagent dispatches 2 with the same description.
Status checks and test runs are exempt from the shell threshold.
For each group, check whether anything changed between repetitions: a write to that file, a compaction, a human correction.
A re-read after an edit is not a finding, a re-read after a compaction is a finding attributed to the compaction, a re-read with nothing in between is a finding on its own.
Look for re-derived decisions: assistant text that reaches a conclusion already stated earlier in the session.
Quote both places.
One finding per group, with the first and last line numbers and the count.
Do not call every repeat a defect.
Do not merge different commands into one group.
