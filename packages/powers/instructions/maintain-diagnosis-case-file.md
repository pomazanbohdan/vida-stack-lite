---
instruction_id: maintain-diagnosis-case-file
title: Maintain the diagnosis case file
summary: "Record the sessions, environment with provenance, discovery commands, and unresolved questions so another reader can repeat the analysis."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The analysis covers several artifacts or several readers.
conditions_does_not_apply_when: The analysis is a single short read.
artifact_contract_output_type: diagnosis-case-file
artifact_contract_required_data:
  - sources
  - field meanings
  - candidates
  - unresolved questions
artifact_contract_verified_by: the case file lets another reader repeat the analysis
compatibility_excludes: []
compatibility_requires:
  - locate-verified-artifact
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/case.md
status: active
revision: 3
---

# Maintain the diagnosis case file
Create one case file per diagnosis session.
Its problem statement names the session or sessions, the turn range if known, what was expected, what happened, and the observable that matters.
Record whether the goal is a bug report.
List each session with its role, session id, absolute path, lines, and bytes.
Record its longest line, first prompt, and first timestamp.
List rejected candidates with the reason, or "none".
Record whether the session was still running at read time.
Record the environment with provenance labels and supporting locations.
Record the discovered sources, extraction commands, and target identity evidence.
Record associated sessions, record shapes, usage counters, timing, and unresolved information.
Record the context-safety rules for every reader of these files.
Missing original paths do not erase retained copies.
Current versions do not establish historical versions; one captured skill body does not authenticate an entire installation.
Subsequent readers use that record rather than repeating discovery.
