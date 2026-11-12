---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-split-platform-sensitive-tests-md-91322c91-c01"
title: "gsd-core: docs/how-to/split-platform-sensitive-tests.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/split-platform-sensitive-tests.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/split-platform-sensitive-tests.md\"}"
atom_ids:
  - fix-a-split-violation-by-moving-code-not-by-exempting
  - move-only-the-platform-signal-not-the-house-idioms
atom_count: 2
atoms: "[{\"atom_id\":\"fix-a-split-violation-by-moving-code-not-by-exempting\",\"file_sha256\":\"d5afffef72659f3952c4d7ddb88cef988ed2d8e2ff8c51f356d792a530b8fef3\",\"content_sha256\":\"12cb99946783cce29f226965ef39d669fd95e2a2e081c1a0b2ca337772c19e8b\",\"file_bytes\":1486,\"body_bytes\":413},{\"atom_id\":\"move-only-the-platform-signal-not-the-house-idioms\",\"file_sha256\":\"19cdf004b3e7c98cb74d532e1b3a5441e53458969adc6f88f0b68f75c0aa7d86\",\"content_sha256\":\"170853fdd3c9761def0af0c22e5b39525c00979178a07ab93e888cff663b77c0\",\"file_bytes\":1545,\"body_bytes\":421}]"
carrier_sha256: 9eabf9917bbb8bf96377adbca2b5af6a9bf170b44338e13b225cd514bb06451d
carrier_bytes: 3352
revision: 1
status: active
---
<!-- vpmodule:atom:begin fix-a-split-violation-by-moving-code-not-by-exempting -->
---
instruction_id: fix-a-split-violation-by-moving-code-not-by-exempting
title: "Fix a split violation by moving code, not by exempting"
summary: A split invariant is repaired by moving the code or rewording the text; an exemption is never the repair.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - automated-enforcement
conditions_applies_when: A split invariant is violated.
conditions_does_not_apply_when: The file is listed for the real operating system as a whole.
artifact_contract_output_type: split-repair
artifact_contract_required_data:
  - the violated invariant
  - the code that was moved or reworded
artifact_contract_verified_by: the invariant holds after the move and no exemption was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/split-platform-sensitive-tests.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fix a split violation by moving code, not by exempting
It never drops a file from the real-OS list silently — every failure below is fixed by moving code or reworking text, never by adding an exemption.
| `base-has-signal` | A base file that has a `.platform` sibling still carries the named signal(s). | Move the test that carries the signal into the sibling, or clear the idiom as in step 3 of the split. |
<!-- vpmodule:atom:end fix-a-split-violation-by-moving-code-not-by-exempting -->
<!-- vpmodule:atom:begin move-only-the-platform-signal-not-the-house-idioms -->
---
instruction_id: move-only-the-platform-signal-not-the-house-idioms
title: "Move only the platform signal, not the house idioms"
summary: "The idioms that stay behind are not platform behaviour, so they do not move with the tests that need a real operating system."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - project-conventions-first
conditions_applies_when: Tests are moved out of a file because of a platform signal.
conditions_does_not_apply_when: No test in the file carries a platform signal.
artifact_contract_output_type: split-file-decision
artifact_contract_required_data:
  - the signal that moved the test
  - the idioms that stayed behind
artifact_contract_verified_by: the moved file carries the signal and the base keeps only the idioms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/split-platform-sensitive-tests.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Move only the platform signal, not the house idioms
**Clear the house idioms left in the base.** These are not platform behavior, so they do not move:
Running the CLI or `git` through raw `child_process` — route it through `tests/helpers/process-seam.cjs` (`runNode`, `runGit`), keeping the helper's return shape for its callers.
A comment that only mentions a signal word — reword it without changing its meaning.
<!-- vpmodule:atom:end move-only-the-platform-signal-not-the-house-idioms -->