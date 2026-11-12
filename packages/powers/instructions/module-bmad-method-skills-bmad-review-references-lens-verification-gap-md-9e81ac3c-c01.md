---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-review-references-lens-verification-gap-md-9e81ac3c-c01"
title: "bmad-method: skills/bmad-review/references/lens-verification-gap.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-review/references/lens-verification-gap.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-review/references/lens-verification-gap.md\"}"
atom_ids:
  - do-not-report-what-the-gap-analysis-must-not-report
  - keep-the-verification-gap-findings-shaped-by-their-kind
  - name-the-three-shapes-of-a-verification-gap
  - seek-verification-of-behavior-not-of-literal-text
  - stop-the-gap-analysis-at-the-inference-boundary
  - trace-the-changed-behavior-to-the-nearest-observable-boundary
  - treat-a-broad-impact-change-as-behavioral
atom_count: 7
atoms: "[{\"atom_id\":\"do-not-report-what-the-gap-analysis-must-not-report\",\"file_sha256\":\"d6e641198ecfc21b7caa13c951ad455ab8ae94c7c66b0df299825955e89566f4\",\"content_sha256\":\"82040e41275e4edd76aa39ee744ab59134cbb97d38661aa4330876b86becc41c\",\"file_bytes\":1646,\"body_bytes\":412},{\"atom_id\":\"keep-the-verification-gap-findings-shaped-by-their-kind\",\"file_sha256\":\"020a3157f32718d756f9fb451760af52622ad26a8e5ee2d8609bf202507a66d7\",\"content_sha256\":\"6739116c3dd896f31671d45ce63b51ac9c634958af6f8c8fddf999893d6880bd\",\"file_bytes\":2113,\"body_bytes\":849},{\"atom_id\":\"name-the-three-shapes-of-a-verification-gap\",\"file_sha256\":\"2c52e4b2e4040c69412e226d403bdfe45793457891cdd5e3e7a3c1794fa426d1\",\"content_sha256\":\"8937ab4d423b6e77c8387227a9f9712ab1caeb308c161813bd8bcb50a6fcf1d0\",\"file_bytes\":1677,\"body_bytes\":563},{\"atom_id\":\"seek-verification-of-behavior-not-of-literal-text\",\"file_sha256\":\"a6e6732c0e45b21b0b28db441282940a0b6b817ff1bab8e1417e9cc88a5d05f8\",\"content_sha256\":\"d0a6eb62be1a369990b36521e58ef5b8be4ba492769878b2de2138151d9c492f\",\"file_bytes\":1811,\"body_bytes\":531},{\"atom_id\":\"stop-the-gap-analysis-at-the-inference-boundary\",\"file_sha256\":\"ed560881fdc6ede4553f990ff2e8011cee1eb9f17ecd24ed5c89d5d0aa1b7167\",\"content_sha256\":\"bfe1b1f76b505094e60bc2db49fe59717a6d27475e2e96635d794c32a45e2186\",\"file_bytes\":1661,\"body_bytes\":363},{\"atom_id\":\"trace-the-changed-behavior-to-the-nearest-observable-boundary\",\"file_sha256\":\"47824d3972cc90a2f98d7984058c1574ca8f2eb8f82c5a55ce22965ea866446d\",\"content_sha256\":\"eed3dd956743571a5853d315eebc5c7d062a5838e7e26f534a903831aee9c178\",\"file_bytes\":2162,\"body_bytes\":869},{\"atom_id\":\"treat-a-broad-impact-change-as-behavioral\",\"file_sha256\":\"b5c751b0f1e8d0237dba7b7701d810ac0671163d26ea9c7a7471191c187cbe8b\",\"content_sha256\":\"539c3b6014d1214df99a9daef0d6ea7f42e58556d61524b4b38a743a2f1d2ba1\",\"file_bytes\":1904,\"body_bytes\":548}]"
carrier_sha256: fb2e6a36792ea349b1b17ecf8b8020a700adae52abafad548a2624bf32de3a29
carrier_bytes: 14073
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-report-what-the-gap-analysis-must-not-report -->
---
instruction_id: do-not-report-what-the-gap-analysis-must-not-report
title: Do not report what the gap analysis must not report
summary: "A gap is not reported for a compiler-enforced case, for behavior an integration test already covers, for low coverage alone, or for untested code the change never touched; a mock-only test does not count as coverage."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A candidate gap is being written out and the exclusions are checked.
conditions_does_not_apply_when: The candidate is a genuine gap that none of the exclusions covers.
artifact_contract_output_type: gap-exclusions
artifact_contract_required_data:
  - the excluded candidates
  - the reason each was excluded
artifact_contract_verified_by: no reported gap falls under one of the excluded kinds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Do not report what the gap analysis must not report
Do not report: cases the compiler or type checker enforces; behavior an integration, contract, or end-to-end test already verifies; low coverage or a missing test file by itself; untested code the change did not touch.
A mock-only or log-call test does not count as verification, so a real regression behind one is a gap rather than a reason to stay silent.
<!-- vpmodule:atom:end do-not-report-what-the-gap-analysis-must-not-report -->
<!-- vpmodule:atom:begin keep-the-verification-gap-findings-shaped-by-their-kind -->
---
instruction_id: keep-the-verification-gap-findings-shaped-by-their-kind
title: Keep the verification-gap findings shaped by their kind
summary: "A gap names its shape, the consumer it hits and the evidence that was actually checked, so a reader can tell a gap from a hunch; a stale-verification gap also says how the assertion should read."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A verification gap is written out as a finding.
conditions_does_not_apply_when: The finding is not a gap and carries no shape.
artifact_contract_output_type: verification-gap-finding
artifact_contract_required_data:
  - the shape of the gap
  - the impacted consumer
  - the evidence that was checked
artifact_contract_verified_by: "every gap names its shape and its consumer, and the evidence names the file and line that was read"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the verification-gap findings shaped by their kind
Emit each gap with the canonical fields plus this lens's extras:
`gap_shape` — "regression-gap", "missing-adoption-gap", "broken-verification-gap", "stale-verification-gap", or "other"
`consumer` — the impacted consumer or site, named concretely with `file:line`
`evidence` — what you actually checked: what the relevant test asserts with `file:line`; or, if none, the symbol/import-reference searches run and their result; for a broken-verification gap, why the apparent test does not count; for a stale-verification gap, the assertion that is wrong or moot
For a stale-verification gap, also say what the test should assert instead, or that it should go.
For `gap_shape: "other"` findings the four canonical fields suffice (description only); `consumer` and `evidence` are optional.
<!-- vpmodule:atom:end keep-the-verification-gap-findings-shaped-by-their-kind -->
<!-- vpmodule:atom:begin name-the-three-shapes-of-a-verification-gap -->
---
instruction_id: name-the-three-shapes-of-a-verification-gap
title: Name the four shapes of a verification gap
summary: "A verification gap is a regression, a missing adoption, a broken verification or a stale verification, and the four shapes are named before the search starts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The verification of a change is being searched for gaps.
conditions_does_not_apply_when: The review is hunting correctness bugs rather than missing verification.
artifact_contract_output_type: gap-shapes
artifact_contract_required_data:
  - the four gap shapes
artifact_contract_verified_by: every gap that is reported names one of the four shapes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the four shapes of a verification gap
The main verification gap shapes are:
1. **Regression gap:** the changed code could regress where it is used, and no test would fail.
2. **Missing-adoption gap:** a site that should use the new behavior still handles the case its own way, and no test would catch that.
3. **Broken-verification gap:** a test looks like it covers the change but does not: it is skipped, flaky, not run normally, or too weak to see the regression.
4. **Stale-verification gap:** a test this change made wrong or moot; it may still pass.
<!-- vpmodule:atom:end name-the-three-shapes-of-a-verification-gap -->
<!-- vpmodule:atom:begin seek-verification-of-behavior-not-of-literal-text -->
---
instruction_id: seek-verification-of-behavior-not-of-literal-text
title: "Seek verification of behavior, not of literal text"
summary: The verification that counts exercises the behavior; static text is not worth a test, and a check that only matches the wording of a document or a prompt is not verification of it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: "The change produced a document, a prompt or an artifact and the search for its verification starts."
conditions_does_not_apply_when: The artifact is produced deterministically and its output is inspected.
artifact_contract_output_type: verification-target
artifact_contract_required_data:
  - the behavior that needs verification
  - the checks that would observe it
artifact_contract_verified_by: every check that is accepted executes the behavior and inspects its output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Seek verification of behavior, not of literal text
Seek verification of behavior, not the literal text of implementation or documentation artifacts.
Tests may assert exact content or structure when they execute deterministic construction or transformation and inspect its output, including generated prompts and request payloads.
Do not seek phrase-existence assertions over hand-authored prompts, skills, documents, or source files: static text is not worth a test, and an assertion on source text never counts as verification.
<!-- vpmodule:atom:end seek-verification-of-behavior-not-of-literal-text -->
<!-- vpmodule:atom:begin stop-the-gap-analysis-at-the-inference-boundary -->
---
instruction_id: stop-the-gap-analysis-at-the-inference-boundary
title: Stop the gap analysis at the inference boundary
summary: "For behavior that ends in a model call, the demand for verification stops at the inference boundary; LLM output is not worth a test, while the deterministic construction and response handling around it still have to be verified."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The changed behavior is backed by a model call.
conditions_does_not_apply_when: No model call is involved in the changed behavior.
artifact_contract_output_type: inference-boundary
artifact_contract_required_data:
  - the deterministic part that is still eligible
  - the boundary where the demand stops
artifact_contract_verified_by: "no finding demands a live inference, and the deterministic construction and response handling are still checked"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Stop the gap analysis at the inference boundary
For LLM-backed behavior, stop at the inference boundary: do not require invoking a model or judging its semantic response.
LLM output is not worth a test.
Deterministic request construction and response handling remain eligible without live inference; existing tests that call a model are not precedent for more.
<!-- vpmodule:atom:end stop-the-gap-analysis-at-the-inference-boundary -->
<!-- vpmodule:atom:begin trace-the-changed-behavior-to-the-nearest-observable-boundary -->
---
instruction_id: trace-the-changed-behavior-to-the-nearest-observable-boundary
title: Trace the changed behavior to the nearest observable boundary
summary: "The changed behavior is traced from the direct callers and the registered entry points, and the trace stops at the nearest boundary where a test would fail."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The behavior that changed is known and the places that observe it have to be found.
conditions_does_not_apply_when: "No behavior changed, so there is nothing to trace."
artifact_contract_output_type: consumer-trace
artifact_contract_required_data:
  - the entry points
  - the consumers that observe the behavior
  - the boundary the trace stopped at
artifact_contract_verified_by: "every traced consumer is one the changed behavior actually reaches, and the trace stops at a named boundary"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Trace the changed behavior to the nearest observable boundary
Trace the changed behavior to the places that observe it. Start with direct callers and registered entry points (routes, commands, DI), contract consumers (schemas, events, APIs, database readers), and reverse-dependency info if already available.
Follow a path only while the changed behavior is reachable and unverified. Stop when a test at that boundary would fail, the consumer does not observe the changed behavior, or the next hop is guesswork (dynamic dispatch, reflection, outside-repo consumers, etc.).
Prefer the nearest observable boundary, often one to three hops away, especially across contract, integration, or service edges.
If there are more than five similar consumers, group obvious repeats and check representative paths; expand only when a consumer observes the behavior differently.
<!-- vpmodule:atom:end trace-the-changed-behavior-to-the-nearest-observable-boundary -->
<!-- vpmodule:atom:begin treat-a-broad-impact-change-as-behavioral -->
---
instruction_id: treat-a-broad-impact-change-as-behavioral
title: Screen a broad-impact change instead of assuming it is behavioral
summary: "A dependency, toolchain, build setting or data-file change is screened like any other part: behavioral when it changes runtime behavior, and skipped when the build or CI run itself checks it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A change is screened for behavioral effect and it touches something wider than one function.
conditions_does_not_apply_when: The change is confined to one function and the screen has already been done.
artifact_contract_output_type: behavioral-screen
artifact_contract_required_data:
  - the parts of the change
  - which of them are behavioral
artifact_contract_verified_by: "a broad-impact change is counted as behavioral only when it changes runtime behavior, and a change the build or CI run itself checks is not reported as a gap"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Screen a broad-impact change instead of assuming it is behavioral
Do not treat a dependency, toolchain, build/config or data-file change as behavioral by default.
Screen it like any other part: it is behavioral when it alters return values, errors, side effects callers can see, or observable state at runtime.
A broad-impact change that alters runtime behavior is still behavioral even when no single changed line looks important.
When the build or CI run itself checks the change, it is not worth a gap finding: that check is the verification.
<!-- vpmodule:atom:end treat-a-broad-impact-change-as-behavioral -->