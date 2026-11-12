---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-scope-code-review-depth-by-path-md-2f84d862-c01"
title: "gsd-core: docs/how-to/scope-code-review-depth-by-path.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/scope-code-review-depth-by-path.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/scope-code-review-depth-by-path.md\"}"
atom_ids:
  - escalate-the-whole-review-not-the-one-file
  - let-the-more-specific-rule-win-even-when-it-is-weaker
  - print-the-provenance-of-the-resolved-setting
  - report-every-configuration-error-not-only-the-first
atom_count: 4
atoms: "[{\"atom_id\":\"escalate-the-whole-review-not-the-one-file\",\"file_sha256\":\"ba0de8059e9a4d991bf963bbc87a20eb9ba25731bf5cc735fcaa53f062f09e95\",\"content_sha256\":\"05e6d6ea33d81f5d098c94251a3075f882fdfba92c1aee960f7f47d978aa7cda\",\"file_bytes\":1561,\"body_bytes\":481},{\"atom_id\":\"let-the-more-specific-rule-win-even-when-it-is-weaker\",\"file_sha256\":\"917ce374a32f1228086a6fce3819dc84c8ba59543ca78f130102ed371d71dbea\",\"content_sha256\":\"721769feb3b35ee9f785a3d80aced5ba12be474f60d6a2f19fef946bc4ce85ba\",\"file_bytes\":1565,\"body_bytes\":460},{\"atom_id\":\"print-the-provenance-of-the-resolved-setting\",\"file_sha256\":\"a089bfbf246c64a56a4d2e0a3032b4a19ee7ecc1d40c3d8b4b2a7a11df320aeb\",\"content_sha256\":\"b2863062dfe17e1853b0007e0edee0a0d5e4dba371425a31d12aa3096997f3d6\",\"file_bytes\":1358,\"body_bytes\":352},{\"atom_id\":\"report-every-configuration-error-not-only-the-first\",\"file_sha256\":\"05fa3121ee6ea7e1822e4cc171b0249b94dec8c929c6f9e89573e863f3fcb8a8\",\"content_sha256\":\"006e56cbd98848d59327f136d47fb9daf4daf06134ca90f7242c76370a956968\",\"file_bytes\":1426,\"body_bytes\":370}]"
carrier_sha256: e2056bc0b8468d00ea5498203297afb7aadc5c14d136d61f7bad1d927dcf5b60
carrier_bytes: 6521
revision: 1
status: active
---
<!-- vpmodule:atom:begin escalate-the-whole-review-not-the-one-file -->
---
instruction_id: escalate-the-whole-review-not-the-one-file
title: "Escalate the whole review, not the one file"
summary: "One sensitive file raises the depth of the entire review, so a sensitive file is never reviewed shallowly."
capability_tags:
  - review-code
pattern_tags:
  - control-tiering
conditions_applies_when: A rule escalates the review depth for a sensitive path.
conditions_does_not_apply_when: No rule matches the files under review.
artifact_contract_output_type: review-depth-decision
artifact_contract_required_data:
  - the sensitive path
  - the resolved depth
  - the rule that fired
artifact_contract_verified_by: the review ran at the raised depth and the rule that raised it is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Escalate the whole review, not the one file
**Escalation is whole-review, not per-file.**
Depth is a single scalar handed to the reviewer agent; one matched sensitive file is enough to raise the whole review, so a sensitive file is never reviewed shallowly because it shared a phase with unrelated code.
A configured sensitive-path policy is not exempt from this downgrade — the same guard that downgrades `--depth=deep` on a large scope also downgrades a rule-sourced `deep`.
<!-- vpmodule:atom:end escalate-the-whole-review-not-the-one-file -->
<!-- vpmodule:atom:begin let-the-more-specific-rule-win-even-when-it-is-weaker -->
---
instruction_id: let-the-more-specific-rule-win-even-when-it-is-weaker
title: Let the more specific rule win even when it is weaker
summary: A matched rule replaces the global default even when it lowers the depth; otherwise a weaker rule could never take effect.
capability_tags:
  - review-code
pattern_tags:
  - override-layering
conditions_applies_when: A rule and the global default both apply to the files under review.
conditions_does_not_apply_when: No rule matches the files under review.
artifact_contract_output_type: rule-resolution
artifact_contract_required_data:
  - the global default
  - the matched rule
  - the resolved depth
artifact_contract_verified_by: the matched rule decided the depth and the output names it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the more specific rule win even when it is weaker
**Rules win over the global default, even when weaker.** If `workflow.code_review_depth` is `deep` but a matched rule says `quick`, the review runs at `quick` — the rule always replaces the global for files it matches.
This is deliberate: if the strongest tier always won, a `quick` or `standard` rule could never actually take effect whenever the project default was `deep`, making it silently inert.
<!-- vpmodule:atom:end let-the-more-specific-rule-win-even-when-it-is-weaker -->
<!-- vpmodule:atom:begin print-the-provenance-of-the-resolved-setting -->
---
instruction_id: print-the-provenance-of-the-resolved-setting
title: Print the provenance of the resolved setting
summary: "The run names the rule, the config value or the flag that produced the effective setting."
capability_tags:
  - review-code
pattern_tags:
  - decision-trail
conditions_applies_when: A setting is resolved from several sources.
conditions_does_not_apply_when: The setting has a single source.
artifact_contract_output_type: resolved-setting-provenance
artifact_contract_required_data:
  - the resolved value
  - the source it came from
artifact_contract_verified_by: one line names the resolved value and the source it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Print the provenance of the resolved setting
Every review prints one line naming the resolved depth and why:
| `matched rule N: <path>` | Rule at index `N` (0-based, in declaration order) matched on prefix `<path>` and set the depth. |
| `from workflow.code_review_depth` | No rule matched this review's file set; the global config value was used. |
<!-- vpmodule:atom:end print-the-provenance-of-the-resolved-setting -->
<!-- vpmodule:atom:begin report-every-configuration-error-not-only-the-first -->
---
instruction_id: report-every-configuration-error-not-only-the-first
title: "Report every configuration error, not only the first"
summary: A malformed configuration prints one error per defect and stops; it never falls back to a default.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A configuration is rejected before the work starts.
conditions_does_not_apply_when: The configuration is valid.
artifact_contract_output_type: configuration-errors
artifact_contract_required_data:
  - every defect
  - the rule index and the offending value
artifact_contract_verified_by: every collected defect is printed and no default was silently used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report every configuration error, not only the first
prints one error per defect (all of them, not just the first) and stops — it never silently falls back to a default depth.
Each printed error names the rule index (and, where applicable, the offending path or depth value) so you can find the exact entry to fix without guessing which rule in the array is broken.
<!-- vpmodule:atom:end report-every-configuration-error-not-only-the-first -->