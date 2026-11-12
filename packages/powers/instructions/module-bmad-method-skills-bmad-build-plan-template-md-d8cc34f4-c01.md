---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-plan-template-md-d8cc34f4-c01"
title: "bmad-method: skills/bmad-build/plan-template.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-build/plan-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build/plan-template.md\"}"
atom_ids:
  - audit-the-behaviour-matrix-against-the-tests
  - delete-a-plan-section-that-has-nothing-to-say
  - freeze-the-human-owned-intent-in-the-plan
  - keep-the-plan-within-the-token-budget
  - log-every-review-finding-with-its-verdict
  - score-the-change-risk-and-scale-the-review-with-it
atom_count: 6
atoms: "[{\"atom_id\":\"audit-the-behaviour-matrix-against-the-tests\",\"file_sha256\":\"0e3743dd00f432471d69b03f6309a8bef6b1f9b073b8d42dc36fe0e9eb7a7c2c\",\"content_sha256\":\"b281b0393edf73502e5be1586bc2c3d059779375632eafd5a91261a22dee6f5c\",\"file_bytes\":2568,\"body_bytes\":1033},{\"atom_id\":\"delete-a-plan-section-that-has-nothing-to-say\",\"file_sha256\":\"200dc5c5591677cd118dfd94b086f6c2a808d52646567722ef0c61f6fd889a9c\",\"content_sha256\":\"88c63b274c18a3766ca861c04af6d45c435ded6e3cd50d5611bb4a8eab9e077f\",\"file_bytes\":1342,\"body_bytes\":266},{\"atom_id\":\"freeze-the-human-owned-intent-in-the-plan\",\"file_sha256\":\"762ad1421b6d89b13d9a4521bd9c163126d14afb44ae29de1e2c1b1a5ec35eae\",\"content_sha256\":\"8fcd80b5864927fab0ff31b0b7d954ca8ae31adf8fe8aadecd72d05de3499053\",\"file_bytes\":2089,\"body_bytes\":661},{\"atom_id\":\"keep-the-plan-within-the-token-budget\",\"file_sha256\":\"d36049f191fa5d9fc955fc481c895b66151a06976185dc608965cfe2b6a5f4b5\",\"content_sha256\":\"e22068c7c72f256c6d838f2bea3773cb254499f12b4d88237d29506689d29f5a\",\"file_bytes\":2298,\"body_bytes\":854},{\"atom_id\":\"log-every-review-finding-with-its-verdict\",\"file_sha256\":\"0a3b121f53adad7d6823fd7739ae4eb72f4274e0e7850b869cded885fe891082\",\"content_sha256\":\"07d31b37220158f82f89f6c37fda758a23e5f38429b706a65582018be2bf826c\",\"file_bytes\":2267,\"body_bytes\":904},{\"atom_id\":\"score-the-change-risk-and-scale-the-review-with-it\",\"file_sha256\":\"5e97fe1df4379fd8873055c330e0d22788e2ce7c2f7f336296e8c00da56cc2b8\",\"content_sha256\":\"af71168959b6c48a1f1262bff0bc366f20cc79c4b323bf6c892593e38a43fc3d\",\"file_bytes\":1666,\"body_bytes\":344}]"
carrier_sha256: d112e4f33d5b08a9927bce1aa65ec0eb613e17efa281137892aefb8d87a3e11e
carrier_bytes: 13093
revision: 1
status: active
---
<!-- vpmodule:atom:begin audit-the-behaviour-matrix-against-the-tests -->
---
instruction_id: audit-the-behaviour-matrix-against-the-tests
title: Audit the behaviour matrix against the tests
summary: "Every row of the plan's I/O and edge-case matrix must be covered by a test that ran and passed, and a test that contradicts the matrix means the code is wrong, not the expectation."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The plan carries an I/O and edge-case matrix and the code has been written.
conditions_does_not_apply_when: "The plan has no matrix, because the work has no meaningful I/O scenarios."
artifact_contract_output_type: matrix-audit
artifact_contract_required_data:
  - the matrix rows
  - the test that covers each row
  - the run result of each covering test
  - the gap for every row without a covering test
artifact_contract_verified_by: every matrix row has a covering test whose run and pass are in the verification output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-03-implement.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/validate-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Audit the behaviour matrix against the tests

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|

If `{plan_file}`'s `<frozen-after-approval>` block contains an I/O & Edge-Case Matrix, verify every matrix row is covered by at least one test that verifies its expected behavior, and that each covering test ran and passed in the verification output. A covering test that exists but did not run — unregistered, filtered out, skipped, or disabled — counts as missing. If a test disagrees with the matrix, never edit the expectation to match the code: fix the code, or if the matrix row itself is ambiguous, HALT and ask the human. Fix any other audit failure before proceeding.
COVERED — Test exists, targets behavior, runs green
PARTIAL — Test exists, failing or incomplete
MISSING — No test found
Match each requirement to existing tests by filename, imports, test descriptions. Record: requirement → test_file → status.
<!-- vpmodule:atom:end audit-the-behaviour-matrix-against-the-tests -->
<!-- vpmodule:atom:begin delete-a-plan-section-that-has-nothing-to-say -->
---
instruction_id: delete-a-plan-section-that-has-nothing-to-say
title: Delete a plan section that has nothing to say
summary: A section with no content is deleted from the plan; a placeholder such as N/A or None is never written in its place.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A plan section has no content to carry.
conditions_does_not_apply_when: "The section has something to say, even if the content is short."
artifact_contract_output_type: plan-section-decision
artifact_contract_required_data:
  - the sections that were deleted
  - the sections that were kept
artifact_contract_verified_by: no section of the plan holds a placeholder in place of content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Delete a plan section that has nothing to say

Do not write "N/A" or "None".

- If the approach is straightforward, delete this section.
- If no build, test, or lint commands apply, delete this section.
- If no meaningful I/O scenarios exist, delete this section.
<!-- vpmodule:atom:end delete-a-plan-section-that-has-nothing-to-say -->
<!-- vpmodule:atom:begin freeze-the-human-owned-intent-in-the-plan -->
---
instruction_id: freeze-the-human-owned-intent-in-the-plan
title: Freeze the human-owned intent in the plan
summary: The plan carries the human-owned intent in a block that is read-only for the agent and locked once the human approves it.
capability_tags:
  - plan-implementation
pattern_tags:
  - frozen-intent
conditions_applies_when: A plan document holds the intent the work is built from.
conditions_does_not_apply_when: There is no plan document and the intent lives only in the conversation.
artifact_contract_output_type: frozen-intent-block
artifact_contract_required_data:
  - the human-owned intent block
  - the state that locks it
  - the place an intent gap is recorded instead
artifact_contract_verified_by: the block was not written by the agent after the approval and no intent gap was filled in as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-03-implement.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Freeze the human-owned intent in the plan

`<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">`

Content inside `<frozen-after-approval>` in `{plan_file}` is read-only. Do not modify.

The ticket's Description and Requirements are that human-owned intent; copy them in as read, never re-derive them from its `sources:`.

Never write an intent gap into the frozen block as an assumption.

If `preserved_intent` is non-empty, replace the `<frozen-after-approval>` block with it before writing.

Set status `ready-for-dev`; everything inside `<frozen-after-approval>` is then locked and only the human can change it.
<!-- vpmodule:atom:end freeze-the-human-owned-intent-in-the-plan -->
<!-- vpmodule:atom:begin keep-the-plan-within-the-token-budget -->
---
instruction_id: keep-the-plan-within-the-token-budget
title: Keep the plan within the token budget
summary: A plan targets 900–1300 tokens and stays inside 900–1600; past the upper bound the plan is regenerated for the narrowed goal instead of being carved up.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan has been written and its length is known.
conditions_does_not_apply_when: The work is a single change with no plan document.
artifact_contract_output_type: plan-size-check
artifact_contract_required_data:
  - the token count of the plan
  - the decision to split or to keep the full plan
  - the narrowed goal when the plan was split
artifact_contract_verified_by: the token count was shown and the plan was either regenerated for one goal or kept with the count stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the plan within the token budget

Target: 900–1300 tokens (less if route is oneshot). Above 1600 = high risk of context rot.

**900–1600 tokens**: Optimal range for LLM consumption. Below 900 risks ambiguity; above 1600 risks context-rot in implementation agents.

Cohesive cross-layer changes (DB+BE+UI) stay in ONE file.

**Token count** (see SCOPE STANDARD). If the plan exceeds 1600 tokens, show the count and give the user a choice:

**Split** — carve off secondary goals. Propose the split — name each secondary goal.

Rewrite the current plan to cover only the main goal — do not surgically carve sections out; regenerate the plan for the narrowed scope.

**Keep full plan** — accept the risks.

If token count exceeded 1600 and the user chose to keep the full plan, include the token count and explain why it may be a problem.
<!-- vpmodule:atom:end keep-the-plan-within-the-token-budget -->
<!-- vpmodule:atom:begin log-every-review-finding-with-its-verdict -->
---
instruction_id: log-every-review-finding-with-its-verdict
title: Log every review finding with its verdict
summary: "The review triage log is append-only, gets a row on every review pass, and keeps one row per finding with its verdict, its route and its evidence."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A review pass produced findings.
conditions_does_not_apply_when: The review produced no findings at all.
artifact_contract_output_type: review-triage-log
artifact_contract_required_data:
  - one row per finding
  - the verdict of the finding
  - the route of the finding
  - the evidence for the verdict
artifact_contract_verified_by: every finding has exactly one row and no row was dropped or merged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-oneshot.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Log every review finding with its verdict

Append-only.

On EVERY review pass, including loopbacks and blocked exits.

Each entry records verdict counts (Critical/Important/Minor/false/maybe-false) and one row per reviewer finding: verdict, route, and evidence — the refutation for false, what would settle it for maybe-false, the action taken for patches.

Every finding gets one row in the `## Review Triage Log` section of `{plan_file}` — verdict plus its evidence in a sentence or two; never drop, merge, or silently skip one.

Write down every finding with its verdict and evidence. Do not drop any.

If review found anything, add `## Review Triage Log` with one line per finding: verdict and evidence. For `false`, the disproof. For `maybe-false`, what would settle it.

If `## Review Triage Log` already has rows — a loopback or a resumed review — check each finding against them first.
<!-- vpmodule:atom:end log-every-review-finding-with-its-verdict -->
<!-- vpmodule:atom:begin score-the-change-risk-and-scale-the-review-with-it -->
---
instruction_id: score-the-change-risk-and-scale-the-review-with-it
title: Score the change risk and scale the review with it
summary: "The plan records the risk of the change as the business impact if it is wrong, and that score is what decides how much review the change gets."
capability_tags:
  - plan-implementation
pattern_tags:
  - verification-before-completion
conditions_applies_when: The investigation is done and the change is about to be planned.
conditions_does_not_apply_when: The change is too small to carry a risk score.
artifact_contract_output_type: change-risk-score
artifact_contract_required_data:
  - the risk level of the change
  - the business impact if the change is wrong
  - the reason for the level
artifact_contract_verified_by: the recorded risk level states the business impact if the change is wrong
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Score the change risk and scale the review with it

Then score the change's `risk` for `{plan_file}` frontmatter: `low`, `medium`, or `high`, the business impact if this change is wrong.

Raise it when the investigation shows more; go below it only when the user says so.

- A CI process can read it to decide how much review the change gets
<!-- vpmodule:atom:end score-the-change-risk-and-scale-the-review-with-it -->