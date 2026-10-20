---
instruction_id: analyze-quality-claims
title: Match quality claims to evidence
summary: "Check each claim of done or passing against a result in the same turn, and compare commit messages with what the calls performed."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The complaint concerns unsupported claims or false completion.
conditions_does_not_apply_when: The artifact contains no claims about the state of the work.
artifact_contract_output_type: quality-evidence-report
artifact_contract_required_data:
  - claims
  - evidence
  - gaps
  - criteria
artifact_contract_verified_by: each claim matched to a result in the same turn
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/quality-evidence.md
status: active
revision: 2
---

# Match quality claims to evidence
Judge the process against its own claims. This is not a code review; do not evaluate the code the session produced.
Tests: every test run with its result line.
Report runs that failed and what the assistant did next.
Verification behind claims: find assistant text claiming done, fixed, passing, verified, works, complete.
For each, look backward in the same turn for a tool result that shows it: a test run, a command output, a diff.
Report claims with no supporting result in that turn.
Commits: every commit with its message; compare each message to the tool calls in the preceding turn or turns.
Report commits whose message claims work that no tool call performed.
Report work performed that was never committed when the agreed plan said it would be.
Review feedback: where a reviewer, human or subagent, raised points, find the response.
Report points acknowledged but not acted on, and points dismissed without a stated reason.
Acceptance criteria: if the problem statement or the agreed plan states criteria, report each as met, not met, or not checked with the evidence line.
Cite the evidence line.
Do not trust a summary without its output.
