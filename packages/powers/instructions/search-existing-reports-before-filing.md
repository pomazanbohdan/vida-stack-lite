---
instruction_id: search-existing-reports-before-filing
title: Search existing reports before filing one
summary: "Look for the same symptom in open and closed reports, show the closest match, and file only after the exact text is approved."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A bug report or an unexpected-behavior report is about to be filed.
conditions_does_not_apply_when: The report is already attached to an existing case.
artifact_contract_output_type: report-search
artifact_contract_required_data:
  - symptom
  - search terms
  - closest report
  - decision
artifact_contract_verified_by: a search performed before filing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/references/github-issues.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Search existing reports before filing one
Use the host's CLI when it is installed and authenticated.
It handles auth, rate limits, and JSON.
Fall back to the public API, then to a URL your partner opens.
Search open and closed issues for the symptoms.
Search with the numbers, states, and titles in view.
Show matches and suggest adding the report to the closest.
If none match, fill the issue template, write it to the workspace, and show the exact text.
Create the issue only after approval.
The CLI cannot attach files; if a bundle exists, give your partner its path to attach in the browser.
A prefilled link on the template applies both labels for any reporter.
Labels drop silently when the reporter lacks push access, so the labels land only for collaborators.
The template footer still marks the issue as a skill-filed report.
The host rejects URLs over about 8,000 characters; past that, send the link with the title only and tell your partner to paste the body from the file.
Do not open a duplicate before searching.
