---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-progress-md-ba81ed49-c01"
title: "gsd-core: gsd-core/workflows/progress.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/workflows/progress.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/progress.md\"}"
atom_ids:
  - advise-without-applying-the-fix
  - counts-do-not-close-a-phase
  - keep-archived-open-work-visible
  - order-the-routing-rows-so-the-first-match-wins
  - scan-every-phase-for-unfinished-work-before-routing
  - trust-the-authoritative-record-not-the-secondary-note
atom_count: 6
atoms: "[{\"atom_id\":\"advise-without-applying-the-fix\",\"file_sha256\":\"c72ebb125e6082e15b0b19ace242f924808fbfd6edc48e9b177ec4523389f7dc\",\"content_sha256\":\"808f03a0ad767093eacbf82a1cb0b43ff3aed37133b1e474613a7b91c5e2fe5c\",\"file_bytes\":1823,\"body_bytes\":564},{\"atom_id\":\"counts-do-not-close-a-phase\",\"file_sha256\":\"141eb2a9c9c58e630551a223c02da1856f2dfc5eddf64854e2e3120f13b823e8\",\"content_sha256\":\"bad9507d62891e55c806d7dd171f6a0161c178cceca631d329ef97c19d2a2f41\",\"file_bytes\":1255,\"body_bytes\":217},{\"atom_id\":\"keep-archived-open-work-visible\",\"file_sha256\":\"1fb5ed3acc94248856dc3e537eaa33f3e0e41def59d3e8f18ab2b650b72f4cf5\",\"content_sha256\":\"151fdb6583d74207a39c3684c45e61c9379192a6b8428e92480ecc92bd9d539c\",\"file_bytes\":1340,\"body_bytes\":280},{\"atom_id\":\"order-the-routing-rows-so-the-first-match-wins\",\"file_sha256\":\"07f96ebda99ee47c4a28d7ae8b2a3c0334cc5272056ce15109466f351e3cabf8\",\"content_sha256\":\"6d7bc8b0a546e7ac7c7d9ef69517e6f36fee73d5a4c6adbe1bff3e7e46eafeb6\",\"file_bytes\":1288,\"body_bytes\":167},{\"atom_id\":\"scan-every-phase-for-unfinished-work-before-routing\",\"file_sha256\":\"b0d674cae055f4e7815eb913951a7bf2f52a1d291d9f0dffc824582a29253e68\",\"content_sha256\":\"203280efebd0f4f2ed434d34e1b5f8f4fed9cd7a32c1b6a1197eb4586fafa680\",\"file_bytes\":1447,\"body_bytes\":339},{\"atom_id\":\"trust-the-authoritative-record-not-the-secondary-note\",\"file_sha256\":\"9b72a886dd1a296e33e1f45f0368c5402465cd793da992591666bc8f74811474\",\"content_sha256\":\"68f7c5d42ce8eacabe5f849eb971f2c1002bd758e8c1564a306f908f0ce7a529\",\"file_bytes\":1396,\"body_bytes\":299}]"
carrier_sha256: f9bc548fa22e9c40a4c73ff6134f098f108e53412f0033d860cf375885c3dea9
carrier_bytes: 9374
revision: 1
status: active
---
<!-- vpmodule:atom:begin advise-without-applying-the-fix -->
---
instruction_id: advise-without-applying-the-fix
title: Advise without applying the fix
summary: "A review is advice, not a gate: the findings are ordered by severity, each with its fix, and none is applied unless it is asked for."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - output-formatting
conditions_applies_when: A review of an existing artefact is asked for.
conditions_does_not_apply_when: The review is part of a build that is going to be fixed in this session.
artifact_contract_output_type: advisory-review
artifact_contract_required_data:
  - the findings in severity order
  - the fix for each finding
  - the verdict of each lens
  - the written report
artifact_contract_verified_by: "the findings are ordered, each carries its fix, and nothing was changed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Advise without applying the fix
Advice, not a gate.
Merge the lens returns, drop duplicates (same file, same place, same point), order by severity.
Give the findings in chat, each in two lines: what and where, then the fix; one line per lens with its verdict above them.
Write the same list as markdown
so the user can work from it later; no other format.
Offer the edit mode
for the findings the user wants applied; apply none unasked.
This is a WARNING, not a blocker — routing proceeds normally.
The debt is visible so the user can make an informed choice.
<!-- vpmodule:atom:end advise-without-applying-the-fix -->
<!-- vpmodule:atom:begin counts-do-not-close-a-phase -->
---
instruction_id: counts-do-not-close-a-phase
title: Counts do not close a phase
summary: A phase is finished only when its verification passed; matching counts alone never close it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The status of a phase is derived from what was produced.
conditions_does_not_apply_when: The verification report already says it passed.
artifact_contract_output_type: phase-status
artifact_contract_required_data:
  - the count of the artifacts
  - the verification status
  - the route that follows
artifact_contract_verified_by: the phase was not called complete while its verification had not passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Counts do not close a phase
only sees plans/summaries, so without this check such a phase is reported complete and routing skips straight to the next phase.
every other status routes back to close verification debt
<!-- vpmodule:atom:end counts-do-not-close-a-phase -->
<!-- vpmodule:atom:begin keep-archived-open-work-visible -->
---
instruction_id: keep-archived-open-work-visible
title: Keep archived open work visible
summary: Work that was archived while still open stays visible and is never folded into the current total.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A report shows the outstanding work of the current scope.
conditions_does_not_apply_when: Everything open is inside the current scope.
artifact_contract_output_type: debt-report
artifact_contract_required_data:
  - the current open count
  - the archived open count
  - the line each is rendered on
artifact_contract_verified_by: the archived open items are shown on their own line and are not hidden inside the current total
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep archived open work visible
Archived debt stays VISIBLE — an item archived still-open is still open (the archived set can include an unrun security-boundary test).
Render it as its own labeled line; never fold it into the current-milestone total and never filter it away.
<!-- vpmodule:atom:end keep-archived-open-work-visible -->
<!-- vpmodule:atom:begin order-the-routing-rows-so-the-first-match-wins -->
---
instruction_id: order-the-routing-rows-so-the-first-match-wins
title: Order the routing rows so the first match wins
summary: The routing table is read top to bottom and the first matching row decides; the rows that report a failure come before the row that reports success.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - decision-trail
conditions_applies_when: A routing table decides what happens next.
conditions_does_not_apply_when: There is a single unconditional route.
artifact_contract_output_type: routing-table
artifact_contract_required_data:
  - the rows in order
  - the row that matched
  - the route it selected
artifact_contract_verified_by: the first matching row was chosen and the failing states were tested before the passing one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Order the routing rows so the first match wins
Rows are evaluated top to bottom; the first matching row wins.
so non-passed verification is not reported as complete
<!-- vpmodule:atom:end order-the-routing-rows-so-the-first-match-wins -->
<!-- vpmodule:atom:begin scan-every-phase-for-unfinished-work-before-routing -->
---
instruction_id: scan-every-phase-for-unfinished-work-before-routing
title: Scan every phase for unfinished work before routing
summary: "The routing looks across all phases for work that was started and not finished, not only in the phase the record points at."
capability_tags:
  - coordinate-program
pattern_tags:
  - change-impact-assessment
conditions_applies_when: The run decides what to do next.
conditions_does_not_apply_when: Only one phase can hold unfinished work and it is the recorded one.
artifact_contract_output_type: incomplete-work-scan
artifact_contract_required_data:
  - the phase that holds unfinished work
  - the reason the record was not enough
artifact_contract_verified_by: unfinished work was found across the phases before the route was chosen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Scan every phase for unfinished work before routing
Before any current-phase-scoped counting, scan ALL phases for incomplete execution.
was advanced past the phase that actually has unfinished work
Without this guard, the current-phase-scoped count in Step 1 would inspect the wrong phase and the routing would skip the unfinished work.
<!-- vpmodule:atom:end scan-every-phase-for-unfinished-work-before-routing -->
<!-- vpmodule:atom:begin trust-the-authoritative-record-not-the-secondary-note -->
---
instruction_id: trust-the-authoritative-record-not-the-secondary-note
title: "Trust the authoritative record, not the secondary note"
summary: The project record owns the facts; a secondary configuration file that mentions them may be stale and is never used as the source.
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A report needs the name, the milestone, the current phase or the next step."
conditions_does_not_apply_when: The authoritative record was already read.
artifact_contract_output_type: context-authority
artifact_contract_required_data:
  - the authoritative record
  - the secondary source that was ignored
artifact_contract_verified_by: every reported field came from the record that owns it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Trust the authoritative record, not the secondary note
One source owns the facts.
for project name, milestone, current phase, and next-step routing.
blocks are a secondary config aid that may be significantly stale — do NOT use the
project description as a source for any progress report field.
<!-- vpmodule:atom:end trust-the-authoritative-record-not-the-secondary-note -->