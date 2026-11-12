---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-codebase-historian-md-69c7f6ad-c01"
title: "bmad-method: skills/bmad-deep-recon/references/codebase-historian.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-deep-recon/references/codebase-historian.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/codebase-historian.md\"}"
atom_ids:
  - follow-the-trail-only-through-a-cited-commit
  - investigate-history-across-sources
atom_count: 2
atoms: "[{\"atom_id\":\"follow-the-trail-only-through-a-cited-commit\",\"file_sha256\":\"8c427dfbd2ed260a91b9324d679aaffde503409e736ef14b404491ce801483e9\",\"content_sha256\":\"c768472b1b3b203d5dde198b95169bf3d6dd564bc81a7829d26229312433beda\",\"file_bytes\":1585,\"body_bytes\":403},{\"atom_id\":\"investigate-history-across-sources\",\"file_sha256\":\"78183bf4ea5e275e2fe57aaf8a963ac5825ce05b7e4c3e415e444e9f10caabbf\",\"content_sha256\":\"0077e78a94aea7911a2ee06f40fd6f11f00d833bb6afe155f1879b5ad79a4ba1\",\"file_bytes\":5318,\"body_bytes\":2658}]"
carrier_sha256: cc4e1bfa744100d0716df2f09642d4aa412f986fa03257b6be11a990468312f3
carrier_bytes: 7174
revision: 1
status: active
---
<!-- vpmodule:atom:begin follow-the-trail-only-through-a-cited-commit -->
---
instruction_id: follow-the-trail-only-through-a-cited-commit
title: Follow the trail only through a cited commit
summary: "A pull request or an issue is reached only through a commit that is cited, and only what it says about the change it made is taken from it."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: The origin of a cited line is being traced.
conditions_does_not_apply_when: The origin is already recorded in the document.
artifact_contract_output_type: history-trace
artifact_contract_required_data:
  - the commit cited
  - the pull request or issue reached through it
  - what was taken from it
artifact_contract_verified_by: the pull request or issue was reached through a cited commit and only what it says about its own change was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-historian.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Follow the trail only through a cited commit
- Reach a pull request or issue only through a commit you cite, and take from it what it says about the change it made, never what it says comes next.
- Work back from the brief’s commit only: `git blame -L <start>,<end> <commit> -- <path>` on the cited lines, `git log -S<symbol> <commit>` or `-G<regex>`, then the pull request that brought a commit in
<!-- vpmodule:atom:end follow-the-trail-only-through-a-cited-commit -->
<!-- vpmodule:atom:begin investigate-history-across-sources -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase-historian.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
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
<!-- vpmodule:atom:end investigate-history-across-sources -->