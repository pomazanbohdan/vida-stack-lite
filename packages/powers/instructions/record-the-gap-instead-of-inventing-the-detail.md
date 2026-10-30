---
instruction_id: record-the-gap-instead-of-inventing-the-detail
title: Record the gap instead of inventing the detail
summary: "Never invent the user’s detail, the metrics or the scope to fill a gap; record it as an assumption or an open question, and stop when the gaps dominate."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A gap in the input has to be closed before the work can go further.
conditions_does_not_apply_when: The input already contains the answer.
artifact_contract_output_type: recorded-gaps
artifact_contract_required_data:
  - the gap
  - the assumption or open question it became
artifact_contract_verified_by: no invented detail stands in for a gap and every gap is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/references/headless.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/add-or-update-a-host-integration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Record the gap instead of inventing the detail
Anything the caller does not provide is either inferred from inputs/workspace or recorded as `assumptions[]` / `open_questions[]` in the JSON status.
Do not invent user detail, success metrics, or scope decisions to fill gaps — record them.
A recognized domain implication the input leaves unaddressed *is* such a gap — name it as an `open_questions[]` entry (healthcare input silent on PHI/HIPAA, payments silent on PCI, control systems silent on fail-safe) and move on.
Flag it; never invent the answer or coach toward it.
If the input is genuinely too thin to distill (e.g. "an app for hikers" with no surrounding context), stop and suggest
the sibling ceremony skill.
This skill distills; it does not coach.

Where the docs do not state an axis, record the explicit `undocumented` sentinel — not a plausible default.
