---
instruction_id: cite-evidence-lines
title: Cite a path and line for every finding
summary: "Every claim carries an absolute path, a line, a short quote, the turn range, and a confidence level; numbers come from records."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: You are writing a finding or a conclusion about an examined artifact.
conditions_does_not_apply_when: You are only describing the analysis method without making claims.
artifact_contract_output_type: cited-finding
artifact_contract_required_data:
  - path and line
  - quote
  - confidence
artifact_contract_verified_by: "every finding has a path:line citation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/analyst-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Cite a path and line for every finding
Every finding cites `path:line`. No citation, no finding.
Every number comes from the transcript or from a command you ran.
Never from memory.
A finding states one sentence on what happened.
Its evidence is an absolute path and line.
Add a quote of at most 200 characters.
Record the first and last human turn the finding spans.
Record confidence as high, medium, or low.
The dispatcher discards any finding without a `path:line`, so do not write one.
If you found nothing, return `- none found` and the Checked line.
The Checked line names what you examined: files, line ranges, commands used.
Do not quote more than the evidence needs.
Do not use a paraphrase in place of the quoted source.
Never name a number you did not compute from the record.
