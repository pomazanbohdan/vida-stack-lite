---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-build-finish-an-epic-md-712b1ee2-c01"
title: "bmad-method: docs/build/finish-an-epic.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/build/finish-an-epic.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/build/finish-an-epic.md\"}"
atom_ids:
  - close-a-container-against-its-done-when
  - review-the-whole-unit-for-what-isolation-hides
  - state-what-you-checked-in-the-finding
atom_count: 3
atoms: "[{\"atom_id\":\"close-a-container-against-its-done-when\",\"file_sha256\":\"636c5b02871407612a15cc805330b653d94038e05f9c78ed5dc1148cca3a5a39\",\"content_sha256\":\"87ef695f137b99dd2f7ba186429246596e11749ae8274305334ee8d5b8fc7fa6\",\"file_bytes\":2199,\"body_bytes\":769},{\"atom_id\":\"review-the-whole-unit-for-what-isolation-hides\",\"file_sha256\":\"2a70b1285ec515fa46ff0918079f756286caf645f72a132a2d50ba97eb404f70\",\"content_sha256\":\"46d48113fe88cfb2095c7fedd44b02c8d54ef80c5b6da41980806ed8d4bcda27\",\"file_bytes\":1940,\"body_bytes\":641},{\"atom_id\":\"state-what-you-checked-in-the-finding\",\"file_sha256\":\"50d35953fdd713aaf9981bb02c6207ee517f2260955847c58df6328ab0b6dec6\",\"content_sha256\":\"be59d071f9966e42c68fd424b468e7310317f4231967511a8202a6a52060f15c\",\"file_bytes\":3014,\"body_bytes\":1261}]"
carrier_sha256: 127eb76c4a04a6be296f326d94e7ec3d23810ba219a8915823f4a115050bfcb9
carrier_bytes: 7570
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-a-container-against-its-done-when -->
---
instruction_id: close-a-container-against-its-done-when
title: Close a container against its done when
summary: "A container is closed by checking its done condition against the implementation evidence, not by the fact that all of its children are closed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A container is being closed.
conditions_does_not_apply_when: "The container's items are still open."
artifact_contract_output_type: closure-check
artifact_contract_required_data:
  - the done condition checked against the implementation evidence
  - the requirements and constraints
  - the dropped work explained
artifact_contract_verified_by: "the done condition was checked against implementation evidence, not against the items being closed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/finish-an-epic.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Close a container against its done when
Verify the container's Done when against implementation evidence and its requirements, including constraints and companions. All known children done is evidence, not proof the parent is complete; explain any dropped work and confirm remaining scope with the user.
Closing every child does not close the parent. Run the closure check in `validate.md` against its requirements and Done when; the user confirms the parent is complete.
A failing epic never closes as quietly accepted.
If the criteria aren't met, or any of the epic's tickets are still unfinished, and no one overrides the call, it closes as not accepted.
Unfinished tickets make the skill's verdict `rejected`; a human can still override.
The verdict is the gate.
<!-- vpmodule:atom:end close-a-container-against-its-done-when -->
<!-- vpmodule:atom:begin review-the-whole-unit-for-what-isolation-hides -->
---
instruction_id: review-the-whole-unit-for-what-isolation-hides
title: Review the whole unit for what isolation hides
summary: "Judge the finished unit against its own acceptance criteria, because the defects that survive per-item review are the ones isolation hides."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A unit made of several separately built items is finished and must be accepted as a whole.
conditions_does_not_apply_when: The work is a single item that was already reviewed on its own.
artifact_contract_output_type: whole-unit-review
artifact_contract_required_data:
  - "the unit's acceptance criteria"
  - the combined diff
  - the verdict
artifact_contract_verified_by: the unit is judged against its own criteria from the combined diff and commits
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/finish-an-epic.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Review the whole unit for what isolation hides
An epic ships as a stack of tickets, each built and reviewed on its own.
Each ticket passed its own review in isolation, so the bugs that survive to this point are the ones isolation hides.
Nine sessions each add a little to the same file, and none of them ever sees the oversized module they built together.
No session judged the epic as a whole against what it set out to deliver either.
The end of an epic is the moment to close that gap: the diff is fresh and the session logs have not been cleared.
Run integration checks and a retrospective at every epic boundary, not only at the end.
<!-- vpmodule:atom:end review-the-whole-unit-for-what-isolation-hides -->
<!-- vpmodule:atom:begin state-what-you-checked-in-the-finding -->
---
instruction_id: state-what-you-checked-in-the-finding
title: State what you checked in the finding
summary: A finding says what was actually checked and how far the search went; a claim that cannot be grounded is dropped.
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A finding is written about the verification of a change.
conditions_does_not_apply_when: No finding is being written.
artifact_contract_output_type: grounded-finding
artifact_contract_required_data:
  - what was checked
  - how far the search went
  - the finding
artifact_contract_verified_by: every claim in the finding points at something that was read or searched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/finish-an-epic.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/few-shot-examples/verifier.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# State what you checked in the finding
Read a test before claiming what it covers, runs, asserts, or misses.
Before claiming no test exists, search the whole repo by the symbol under test and by import references; expected file locations are not enough.
Never assert what you did not verify. If a finding cannot be grounded, drop it.
In a finding, say what you actually checked — "none of the tests I read cover this" — and show how far you looked.
Say a test doesn't exist anywhere only when the symbol/import-reference search actually shows that.
Before writing a finding, re-open the specific tests or search results the finding relies on.
Verify the Demonstration would not make any test you checked fail, or that the absence claim is backed by the symbol/import-reference search.
Explain why the test misses the bug using what the test sets up and checks.
Every finding carries a source reference: a file, a line, a commit, a log. A claim it can't point at doesn't make the report.
It won't invent a root cause or a pattern the code doesn't back up.
No individual must-have is listed or checked. No file paths, no line numbers, no grep output, no level-by-level breakdown.
The verifier restated the must-haves as passing without showing any evidence.
<!-- vpmodule:atom:end state-what-you-checked-in-the-finding -->