---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-code-reviewer-compact-md-c2290084-c01"
title: "gsd-core: agents/gsd-code-reviewer.compact.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:agents/gsd-code-reviewer.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-code-reviewer.compact.md\"}"
atom_ids:
  - assume-the-submitted-code-is-defective-and-prove-it
  - cite-a-line-number-and-a-concrete-fix-for-every-finding
  - classify-every-review-finding-before-it-leaves-the-review
  - exclude-the-planning-lock-and-generated-files-from-the-review-scope
  - fail-closed-when-the-review-scope-cannot-be-resolved
  - say-clean-only-when-a-review-ran-and-skipped-when-it-did-not
atom_count: 6
atoms: "[{\"atom_id\":\"assume-the-submitted-code-is-defective-and-prove-it\",\"file_sha256\":\"ae93364793369fe1f610453ccbc56e5b67ad68faba40582c23b34bdc53cebbd2\",\"content_sha256\":\"befec4e58f436191a6ac474ae389a7fd31ba9d766ee5c6f3d5971e91bb745c9c\",\"file_bytes\":1553,\"body_bytes\":392},{\"atom_id\":\"cite-a-line-number-and-a-concrete-fix-for-every-finding\",\"file_sha256\":\"bf32b74929bf645ac5f32d75afeb78769ef6a311ed810630e71f9bf08f03888e\",\"content_sha256\":\"14c0b34df18a44a2ac1be1ab94427ec6c407d9117c7cd0ea83b0575d4b6c3ffe\",\"file_bytes\":1586,\"body_bytes\":456},{\"atom_id\":\"classify-every-review-finding-before-it-leaves-the-review\",\"file_sha256\":\"9412a6dd6e0cdc642b0a1f2fae2740411fb86a792f9ef8ff2a90bf5716005b4d\",\"content_sha256\":\"85ec7d8a4db03b6403fdb7b214c870ff07dc4d62afb4133e00a3f6b5c16c064c\",\"file_bytes\":1579,\"body_bytes\":381},{\"atom_id\":\"exclude-the-planning-lock-and-generated-files-from-the-review-scope\",\"file_sha256\":\"879f7a0e976fd7ace4957c97764ccb3173a345c702d0c62ce83cb9db780e3d9b\",\"content_sha256\":\"724e6f0c86b21e190bad864de18b84cb127a1b859bcf5286a3d7d569d183c9e5\",\"file_bytes\":1638,\"body_bytes\":403},{\"atom_id\":\"fail-closed-when-the-review-scope-cannot-be-resolved\",\"file_sha256\":\"aea732354e2d402148893274182a06e8ee6a917a7c39ddd78ec5c2a883745721\",\"content_sha256\":\"17e0577645ca4bfbf559a67305a9b11ba4f971514b8df3815db5dbad2f4df632\",\"file_bytes\":1427,\"body_bytes\":312},{\"atom_id\":\"say-clean-only-when-a-review-ran-and-skipped-when-it-did-not\",\"file_sha256\":\"05610c076d2b7fe784b2ed150e519b52c2c46dc4c27791416ab61c7a32812a04\",\"content_sha256\":\"2784c536c0f5f56e420297f282790cee9661fb1410cb7f83199df09928689556\",\"file_bytes\":1450,\"body_bytes\":240}]"
carrier_sha256: 96c8aa4154f4d8ed937a8dba28d826998489b40819f64e93cc1b5f82eded6a77
carrier_bytes: 10264
revision: 1
status: active
---
<!-- vpmodule:atom:begin assume-the-submitted-code-is-defective-and-prove-it -->
---
instruction_id: assume-the-submitted-code-is-defective-and-prove-it
title: Assume the submitted code is defective and prove it
summary: The review starts from the hypothesis that the code has defects and reports only what it can prove.
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A body of submitted code is reviewed.
conditions_does_not_apply_when: The task is to confirm that a change works as specified.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the proven defects
  - the evidence for each
artifact_contract_verified_by: every reported defect carries proof and none was softened because it looked harsh
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assume the submitted code is defective and prove it
Assume every submitted implementation contains defects.
Surface what you can prove.
Stopping at obvious surface issues (console.log, empty catch) and assuming the rest is sound
Treating "code compiles" or "tests pass" as evidence of correctness
Reading only the file under review without checking called functions for bugs they introduce
<!-- vpmodule:atom:end assume-the-submitted-code-is-defective-and-prove-it -->
<!-- vpmodule:atom:begin cite-a-line-number-and-a-concrete-fix-for-every-finding -->
---
instruction_id: cite-a-line-number-and-a-concrete-fix-for-every-finding
title: Cite a line number and a concrete fix for every finding
summary: "A finding names the file, the line, the problem and the fix; a vague location or a missing fix is not acceptable."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A finding is written.
conditions_does_not_apply_when: The finding is an observation with no fixable location.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the file
  - the line
  - the problem
  - the fix
artifact_contract_verified_by: "every finding names a file, a line and a fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Cite a line number and a concrete fix for every finding
DO use line numbers. Never "somewhere in the file" — always cite specific lines.
Each finding MUST include:
file: Full path to file
line: Line number or range (e.g., "42" or "42-45")
issue: Clear description of the problem
fix: Concrete fix suggestion (code snippet when possible)
DO NOT report issues in test files unless they affect test reliability (e.g., missing assertions, flaky patterns).
<!-- vpmodule:atom:end cite-a-line-number-and-a-concrete-fix-for-every-finding -->
<!-- vpmodule:atom:begin classify-every-review-finding-before-it-leaves-the-review -->
---
instruction_id: classify-every-review-finding-before-it-leaves-the-review
title: Classify every review finding before it leaves the review
summary: "Every finding carries one of the three severities with the criteria of that level attached, and an unclassified finding is not valid output."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A review reports defects.
conditions_does_not_apply_when: The output is a list of improvements rather than findings.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the findings
  - the severity of each
artifact_contract_verified_by: every finding carries exactly one severity and the criteria of that level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify every review finding before it leaves the review
Critical
incorrect behavior, security vulnerability, or data loss risk; must be fixed before this code ships
Important
degrades quality, maintainability, or robustness; should be fixed
Minor
Style issues, naming improvements, dead code, unused imports, suggestions
Findings without a classification are not valid output.
<!-- vpmodule:atom:end classify-every-review-finding-before-it-leaves-the-review -->
<!-- vpmodule:atom:begin exclude-the-planning-lock-and-generated-files-from-the-review-scope -->
---
instruction_id: exclude-the-planning-lock-and-generated-files-from-the-review-scope
title: "Exclude the planning, lock and generated files from the review scope"
summary: "Planning documents, lock files and generated output are left out of the review, while the repository's own prose files stay in."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The list of files to review is filtered.
conditions_does_not_apply_when: No file filter is applied because the file list was supplied as-is.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the excluded file classes
artifact_contract_verified_by: "planning, lock and generated files are excluded and prose files are not excluded wholesale"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Exclude the planning, lock and generated files from the review scope
Do NOT exclude all `.md` files — commands, workflows, and agents are source code in this codebase
Lock files: `package-lock.json`, `yarn.lock`, `Gemfile.lock`, `poetry.lock`
Generated files: `*.min.js`, `*.bundle.js`, `dist/`, `build/`
Planning markdown: `ROADMAP.md`, `STATE.md`, `*-SUMMARY.md`, `*-VERIFICATION.md`, `*-PLAN.md`
<!-- vpmodule:atom:end exclude-the-planning-lock-and-generated-files-from-the-review-scope -->
<!-- vpmodule:atom:begin fail-closed-when-the-review-scope-cannot-be-resolved -->
---
instruction_id: fail-closed-when-the-review-scope-cannot-be-resolved
title: Fail closed when the review scope cannot be resolved
summary: "When the files in scope cannot be determined, the review stops with an error instead of guessing a range."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The set of files to review is not given.
conditions_does_not_apply_when: An explicit file list was supplied.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the reason the scope could not be resolved
artifact_contract_verified_by: the run failed loudly and no heuristic range was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fail closed when the review scope cannot be resolved
Do NOT invent a heuristic (e.g., HEAD~5) or a `base..HEAD` range — silent mis-scoping is worse than failing loudly.
If the resolver reports `status: unresolvable` (it exits 69 and still prints its JSON), or returns no `files`, **fail closed** with error:
<!-- vpmodule:atom:end fail-closed-when-the-review-scope-cannot-be-resolved -->
<!-- vpmodule:atom:begin say-clean-only-when-a-review-ran-and-skipped-when-it-did-not -->
---
instruction_id: say-clean-only-when-a-review-ran-and-skipped-when-it-did-not
title: Say clean only when a review ran and skipped when it did not
summary: A review that found nothing and a review that was not performed are two different results and are reported differently.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A review finishes and its outcome is recorded.
conditions_does_not_apply_when: The review ran and produced findings.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the outcome
  - the reason for the outcome
artifact_contract_verified_by: the outcome distinguishes a completed review from a review that was not performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Say clean only when a review ran and skipped when it did not
status: clean means "reviewed and found no issues."
status: skipped means "no reviewable files — review was not performed."
This distinction matters for downstream consumers.
<!-- vpmodule:atom:end say-clean-only-when-a-review-ran-and-skipped-when-it-did-not -->