---
instruction_id: investigate-history-across-sources
title: Investigate history across sources
summary: "Recover why code looks the way it does from commits, changes, tickets, documents, and conversations, and separate the direct record from inference."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: "You need to understand why code, a structure, or a decision has its present shape."
conditions_does_not_apply_when: The question is about current behavior that the code already answers.
artifact_contract_output_type: history-finding
artifact_contract_required_data:
  - question
  - sources
  - timeline
  - contradictions
  - confidence bounds
artifact_contract_verified_by: each claim linked to a dated source record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/figure-it-out/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/trace-forensics.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/source-playbook.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/code-archaeology.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/databricks.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/datadog.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/incident-postmortem.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/linear.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/notion.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/sentry.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/slack.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-historian.md
status: active
revision: 2
---

# Investigate history across sources
Investigate the motivation and intent behind code. The code shows what it does; the why lives in commits, pull requests, tickets, documents, and conversations, all incomplete, biased, and sometimes missing.
Before searching, establish the code anchor: file paths and line ranges, key symbols, the last few commits touching the target, pull request numbers from merge commits, and any linked ticket identifiers.
If the target is vague, make your best guess from conversation context, state your interpretation briefly so the user can redirect, then proceed.
Operate as a careful, cautious, and precise investigator. Be honest about what you know against what you are inferring.
Default to a full parallel investigation. The goal is a complete coverage map, not a minimal one. Document the null; do not skip the search.
Map each available source to one evidence category: source control history, issue or ticket tracker, long-form documents, real-time team chat, infrastructure observability, error or exception tracking, and product analytics.
Source control is always available. Spawn one investigator per other category that has a matching source, each owning exactly one source.
Skip a category only with an explicit, written justification: no source is available, or the source is provably irrelevant. A high bar. Flag an unavailable source as a gap, not a choice.
Each investigator goes deep on its assigned source only, quotes verbatim with an exact location, and records what it searched, not just what it found. An empty search is a finding.
Follow links within a source only. Record a cross-source reference as a lead for its own investigator.
Resist the story. If two items disagree, record both. A contradiction against a tidy pattern is the most interesting finding.
Mechanics are not motivation. A commit shows the change, not necessarily why. Claim intent only where the author stated it.
Keep uncertainty: say when evidence is ambiguous, or when one reading is more plausible but not certain.
Synthesize into one evidence-cited narrative that says honestly what the evidence supports and what it does not.
Merge overlaps, surface contradictions, and calibrate every claim to its confidence tier.
Document specific gaps: what you searched, in which sources, and what you found or did not find.
When the question points at changing the code, convert the lineage findings into a set of constraints to preserve, change, avoid, and risk.
A commit message is its author’s claim about intent, weaker when an agent wrote it: check it against the diff and prefer the pull request description and the linked issue.
