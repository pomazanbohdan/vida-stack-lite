---
instruction_id: format-diagnosis-report
title: Format the diagnosis report in a fixed structure
summary: "Fill the report sections in order: problem, verdict, environment, sessions, timeline, findings by dimension, involvement, and coverage."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Diagnosis results are being written up for delivery.
conditions_does_not_apply_when: The analysis does not yet have supported findings.
artifact_contract_output_type: structured-diagnosis-report
artifact_contract_required_data:
  - problem
  - verdict
  - environment
  - sessions
  - timeline
  - findings
  - coverage
artifact_contract_verified_by: all required sections present in order
compatibility_excludes: []
compatibility_requires:
  - cite-evidence-lines
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/report.md
status: active
revision: 3
---

# Format the diagnosis report in a fixed structure
The report opens with the problem statement, copied from the case file.
The triage verdict states what the evidence shows happened around the reported problem, in prose, with `path:line` after every claim.
State confidence: high, medium, or low, and what would raise it.
The environment section lists the OS, harness and version, models seen, install root, version and git sha, skill files read or injected, other plugins and servers, and instruction files present.
Label every environment field and skill observation as historical evidence, unverified snapshot, current observation, or unknown, and record its supporting evidence location.
The sessions section lists each role, session id, absolute path, lines, and bytes, plus rejected candidates.
The timeline has one row per human-typed prompt; the events column lists skills invoked, subagents dispatched, compaction, errors, resumes, aborts.
Findings run one subsection per dimension.
Each finding names one sentence, a `path:line` quote, the turns, and confidence.
A dimension with nothing to report says `none found — checked: <what was checked>`.
The involvement section says not indicated, possible, or likely, and states involvement only; it does not name a defect and does not propose a change.
Coverage notes list what was not read and why, unavailable harness features, whether the session was in progress, and what the partner should double-check.
Similar sessions are reported only when requested.
Do not add a section with fixes.
Keep one order for the sections.
