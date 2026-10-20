---
instruction_id: format-quality-findings
title: Present findings by impact in a fixed shape
summary: "Order findings correct, safe, holds under load, tested, fast, lean, group them by severity, and give each one a location and all four parts."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - finding-severity-policy
conditions_applies_when: You present findings from a review or an audit.
conditions_does_not_apply_when: There are no findings.
artifact_contract_output_type: ranked-findings
artifact_contract_required_data:
  - finding groups
  - numbers
  - title with location
  - four parts
  - count left out
artifact_contract_verified_by: "every finding has a location and all four parts, ordered by impact"
compatibility_excludes:
  - report-the-review-in-one-canonical-finding-shape
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
status: active
revision: 5
---

# Present findings by impact in a fixed shape
Order of importance: correct, safe, holds under load, tested, fast, lean.
Lean still matters: every extra line must be read, tested and fixed later.
Then the findings in three groups, most important first, skip empty groups.
Critical: bug, security, data loss, breaks at the expected load.
Important: risky code without a test, real slowness, duplication, a function that mixes jobs, code that should not exist.
Minor: small speed-ups, shorter forms.
Number findings across all groups, so the user can say "fix 2 and 5".
At most 20 findings; if you left smaller ones out, say how many.
Every finding has all four parts.
Each part is one or two short sentences.
Every finding has a bold title with its file and lines.
What this is: what the code is and what it does.
Problem: the input or situation that leads to a wrong result.
Fix: the smallest fix that works.
If we skip it: what goes wrong when the finding is left.

Surface findings tiered, never dumped. Lead with a one-sentence gate verdict, then walk Critical + Important findings; Minor findings roll into a single tail ("plus N more in {file}"). Read the full review file only when the user drills into a specific finding. Per finding: autofix, discuss, defer to open items, or ignore.
