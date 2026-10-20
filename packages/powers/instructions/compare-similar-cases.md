---
instruction_id: compare-similar-cases
title: Match similar cases marker by marker
summary: "Turn confirmed findings into markers and verdict each candidate as a hit, a miss, or unknown, with a path and line for every hit."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: You need to know whether the same behavior recurs in another case.
conditions_does_not_apply_when: There is only one artifact and no candidate to compare.
artifact_contract_output_type: case-matching
artifact_contract_required_data:
  - markers
  - candidates
  - results
  - verdict
artifact_contract_verified_by: "each marker marked hit, miss, or unknown"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/similar-session.md
status: active
revision: 1
---

# Match similar cases marker by marker
You are a matcher. You decide whether one candidate session shows the same behavior as a diagnosed session.
You do not modify any file.
Read the case file first for the context-safety rules, discovered record meanings, and extraction commands to use.
Each marker is one of: a skill sequence within a number of turns, an error string, a repeated command, a repeated file read.
Or a compaction then a behavior, a missed trigger, or a free one-line description.
Apply context safety to the candidate.
Extract its identity with the commands recorded in CASE: session id, cwd, first human prompt, first timestamp, harness version, and models.
For each marker, locate evidence with line-number-first commands.
Then extract trimmed fields from the specific lines.
A marker is `hit` when you have a `path:line`.
It is `miss` when you searched and found nothing, and `unknown` when the transcript lacks the field needed.
Say which field is missing for an unknown marker.
Return `yes` only when every marker hit, `partial` when at least one hit.
Return `no` when none did.
