---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-agents-code-reviewer-md-c7e35aac-c01"
title: "addy-skills: agents/code-reviewer.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:agents/code-reviewer.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"agents/code-reviewer.md\"}"
atom_ids:
  - label-code-review-findings
  - read-the-spec-and-tests-first
  - review-on-fixed-dimensions
atom_count: 3
atoms: "[{\"atom_id\":\"label-code-review-findings\",\"file_sha256\":\"c57073c7ef754afa06104e4ef483c2659dd18d09cc25adb3cbc0d598f44f88cc\",\"content_sha256\":\"bb603bceeb4ebe7f34e45751eb642ef1861fe242942500499f8b1cfcafcebf09\",\"file_bytes\":5260,\"body_bytes\":3339},{\"atom_id\":\"read-the-spec-and-tests-first\",\"file_sha256\":\"775401e9ccb2a4caa011ea531812111fae8d44c025b056fa68278d248d7a65c2\",\"content_sha256\":\"4acbcc1bfd86c38fe83ffcc4c362bdcbf7bb52eca4775a95be6b0e0a658de63c\",\"file_bytes\":1171,\"body_bytes\":152},{\"atom_id\":\"review-on-fixed-dimensions\",\"file_sha256\":\"7b9364b9b2297220c5dd33c684f95d160b76603fdf64fc7dee6fad9b799d6e34\",\"content_sha256\":\"ed01f504d3c9c7f591bbfcea4b665d385a128ef32f4c5b1e2f244153ac5fffc8\",\"file_bytes\":2663,\"body_bytes\":1520}]"
carrier_sha256: ac43ecd53f7e80f947d145036477b6313f75752a133c72ae19e478a8e6ff70e7
carrier_bytes: 9429
revision: 1
status: active
---
<!-- vpmodule:atom:begin label-code-review-findings -->
---
instruction_id: label-code-review-findings
title: Label every finding with a severity
summary: "Give every finding one of the canonical severities - Critical, Important or Minor - and let the label decide whether the change can be approved. The labels are the corpus scale, mapped from the donors own."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - finding-severity-policy
  - finding-shape-policy
conditions_applies_when: A review has produced findings that need a severity and a merge decision.
conditions_does_not_apply_when: The findings already carry a settled severity from an earlier review.
artifact_contract_output_type: labelled-findings
artifact_contract_required_data:
  - finding
  - severity label
  - fix recommendation for Critical and Important
artifact_contract_verified_by: no Critical finding is left without a fix recommendation and the approval follows the labels
compatibility_excludes:
  - report-the-review-in-one-canonical-finding-shape
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/code-reviewer.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/contexts/review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
status: active
revision: 10
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Label every finding with a severity
Categorize every finding.

**Critical** — Blocks merge (security vulnerability, data loss risk, broken functionality)

**Important** — Must address before merge (missing test, wrong abstraction, poor error handling)

**Minor** — Worth considering but not required (a simpler design, a useful refactor); minor and optional, the author may ignore (formatting, naming, style preferences)

Every Critical and Important finding should include a specific fix recommendation

Don't approve code with Critical issues

`Critical` (intolerable), `Important` (tolerable), `Minor` (cosmetic or negligible) — the bad outcome is real. Assign severity by how much it hurts end users or developers. A `Critical` finding is data loss or corruption, a security exposure, a silently wrong result, or a path broken with no workaround. An `Important` finding is broken or wrong, but noticed and worked around, or limited in reach. A `Minor` finding is cosmetic or a minor inconvenience. For developer-only problems (inconsistent design, eroded invariants, duplicated sources of truth), name where it will cause trouble — which caller will diverge, which rule will break. A vague "this is messy" with no named harm is not a severity grade; use `false` or `maybe-false` instead. When the harm is real but you cannot tell how bad, pick the higher grade.
Severity is the impact of a single occurrence; it does not depend on how rare the outcome is, how hard it is to fix, or whether the defect predates the change. A gap finding from the verification-gap lens is `Important`.

`false` — you checked, and the bad outcome does not happen at the cited location. Write what disproves this specific claim. A true fact about nearby code that does not disprove the claim does not count.

`maybe-false` — you could not tell whether the bad outcome happens. Write what you would need to check to find out. Use this only when the diff and surrounding code leave the question open; when they are enough to decide, pick `Critical`, `Important`, `Minor`, or `false`.
The severity of a finding is Critical, Important or Minor.
Critical is intolerable, Important is tolerable, Minor is cosmetic or negligible — in all three the bad outcome is real.
Assign severity by how much it hurts end users or developers.
For developer-only problems (inconsistent design, eroded invariants, duplicated sources of truth), name where it will cause trouble — which caller will diverge, which rule will break.
A vague "this is messy" with no named harm is not a severity grade; use `false` or `maybe-false` instead.
When the harm is real but you cannot tell how bad, pick the higher grade.
Reject Minor findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly — no proof needed) and the fix is more than a direct correction or deletion — adding guards, branches, parameters, or other complexity.
- Organize findings by severity: Critical, Important, Minor.
- A plan that fails any Critical-severity check is returned to the `gsd-planner` for revision (up to 3 iterations).
- **7b — Scope Reduction Detection** | Task actions do not silently reduce a locked decision to a "v1", "stub", or "future enhancement" without delivering the full decision scope. Always Critical when found.
<!-- vpmodule:atom:end label-code-review-findings -->
<!-- vpmodule:atom:begin read-the-spec-and-tests-first -->
---
instruction_id: read-the-spec-and-tests-first
title: Read the spec and the tests first
summary: "Read the spec or task description, and the tests, before reading the implementation under review."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is starting and the intent behind the change has not been read yet.
conditions_does_not_apply_when: The spec or task description and the tests have already been read.
artifact_contract_output_type: review-grounding
artifact_contract_required_data:
  - spec or task description read
  - tests reviewed first
artifact_contract_verified_by: the review names the spec and the tests it was based on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/code-reviewer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the spec and the tests first
Read the spec or task description before reviewing code

Review the tests first — they reveal intent and coverage
<!-- vpmodule:atom:end read-the-spec-and-tests-first -->
<!-- vpmodule:atom:begin review-on-fixed-dimensions -->
---
instruction_id: review-on-fixed-dimensions
title: Review the change on fixed dimensions
summary: "Judge every change on the same five dimensions - correctness, readability, architecture, security and performance - with a fixed question for each."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A change is up for review and no rubric for it has been fixed yet.
conditions_does_not_apply_when: "The review is scoped to one dimension only, or the questions for it are already fixed elsewhere."
artifact_contract_output_type: dimension-review
artifact_contract_required_data:
  - the five dimensions
  - per-dimension findings
  - the questions answered per dimension
artifact_contract_verified_by: the report answers the questions of every dimension under its own heading
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/code-reviewer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Review the change on fixed dimensions
Evaluate every change across these five dimensions:

## Correctness
- Does the code do what the spec/task says it should?
- Are edge cases handled (null, empty, boundary values, error paths)?
- Do the tests actually verify the behavior? Are they testing the right things?
- Are there race conditions, off-by-one errors, or state inconsistencies?

## Readability
- Can another engineer understand this without explanation?
- Are names descriptive and consistent with project conventions?
- Is the control flow straightforward (no deeply nested logic)?
- Is the code well-organized (related code grouped, clear boundaries)?

## Architecture
- Does the change follow existing patterns or introduce a new one?
- If a new pattern, is it justified and documented?
- Are module boundaries maintained? Any circular dependencies?
- Is the abstraction level appropriate (not over-engineered, not too coupled)?
- Are dependencies flowing in the right direction?

## Security
- Is user input validated and sanitized at system boundaries?
- Are secrets kept out of code, logs, and version control?
- Is authentication/authorization checked where needed?
- Are queries parameterized? Is output encoded?
- Any new dependencies with known vulnerabilities?

## Performance
- Any N+1 query patterns?
- Any unbounded loops or unconstrained data fetching?
- Any synchronous operations that should be async?
- Any unnecessary re-renders (in UI components)?
- Any missing pagination on list endpoints?
<!-- vpmodule:atom:end review-on-fixed-dimensions -->