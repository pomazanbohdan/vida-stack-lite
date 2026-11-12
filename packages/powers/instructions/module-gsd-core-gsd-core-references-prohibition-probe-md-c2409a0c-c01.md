---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-prohibition-probe-md-c2409a0c-c01"
title: "gsd-core: gsd-core/references/prohibition-probe.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/references/prohibition-probe.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/prohibition-probe.md\"}"
atom_ids:
  - ask-the-adversarial-question-then-narrow-the-answer
  - do-not-mint-a-prohibition-a-dedicated-tool-already-owns
  - recall-wide-then-filter-for-precision
  - require-a-reason-for-every-dismissed-prohibition
  - surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion
atom_count: 5
atoms: "[{\"atom_id\":\"ask-the-adversarial-question-then-narrow-the-answer\",\"file_sha256\":\"6d9b9196eabf6c934ee4a089bcf65f64ac6074b45822de6bd5f2329a20d30741\",\"content_sha256\":\"2f977626c8062a7ac7f8d5c5ae90404b85fb7a2d58a2b8c38e4fdb0f8a030942\",\"file_bytes\":2330,\"body_bytes\":1017},{\"atom_id\":\"do-not-mint-a-prohibition-a-dedicated-tool-already-owns\",\"file_sha256\":\"b6cfba04583c98cccb374a872427b84261c666acb2393d2f23dfd6446709f5c6\",\"content_sha256\":\"a1e144bbaaecbd6a293e3b7f73b1ad1f68f891b202c90ec1b71d2f0f6393d038\",\"file_bytes\":1466,\"body_bytes\":353},{\"atom_id\":\"recall-wide-then-filter-for-precision\",\"file_sha256\":\"e6f655bb96cabc3d7c9bb70ad5d32b78a389d98a5b7676f2499ced48bd9a045e\",\"content_sha256\":\"abe78fa26f32d03f1a14ae25eef4cfbc180e9798041f51c9b21f934da3c3db14\",\"file_bytes\":2206,\"body_bytes\":994},{\"atom_id\":\"require-a-reason-for-every-dismissed-prohibition\",\"file_sha256\":\"697dc9d63b0b3901f57ac8437dbe63378978535b30ecec110e3706f41b8c112a\",\"content_sha256\":\"de3f8d2e5cb174dfbf85529de0d062e82fa16bb2ec7d94795935aa44e450c2a0\",\"file_bytes\":1438,\"body_bytes\":358},{\"atom_id\":\"surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion\",\"file_sha256\":\"ecd5c87ccfde3594d5d6c1e86ae55b97a431d85705286bd71e8fbf6add217d80\",\"content_sha256\":\"904980e1531925cdcd15b1408f00ac66e298a585b10c3f32027b6dd1662588b4\",\"file_bytes\":1740,\"body_bytes\":619}]"
carrier_sha256: ddb6a4f383e15a03ddd172f2387ea11a8cba0fcd0bedba32f01b96368baea857
carrier_bytes: 9985
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-the-adversarial-question-then-narrow-the-answer -->
---
instruction_id: ask-the-adversarial-question-then-narrow-the-answer
title: "Ask the adversarial question, then narrow the answer"
summary: The recall stage asks one open adversarial question per requirement and over-produces; the precision stage drops the routine-engineering items in one pass.
capability_tags:
  - clarify-requirements
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The constraints a requirement forbids are being surfaced.
conditions_does_not_apply_when: The requirement has already been through this pass.
artifact_contract_output_type: prohibition-recall
artifact_contract_required_data:
  - the raw candidates
  - the ones that were dropped
  - the ones that were kept
artifact_contract_verified_by: the raw list was narrowed by one drop/keep pass and a zero result is accepted as the outcome
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/prohibition-probe.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/specless-probe-fallback.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Ask the adversarial question, then narrow the answer
*What could this feature silently become that the author would NOT want, but the spec does not forbid?*
Filter the raw Stage-1 list in a single pass. The rule is a drop/keep split
**DROP routine-engineering items** — anything that is a normal correctness or hygiene concern rather than an intent constraint: "must not mutate its input", "must not throw on empty list", "must return a primitive not an object", "must not leak a file handle". These belong to the edge-probe or to ordinary code review, not here
**KEEP values / safety / ethics items** — anything that, if violated, makes the feature do something the author would object to on product, fairness, privacy, transparency, or safety grounds: "must not use shaming framing", "must not proxy on protected attributes", "must not store raw PII in plaintext"
A requirement that yields zero kept prohibitions emits an empty list — that is the correct precision outcome for a pure utility, not a failure
<!-- vpmodule:atom:end ask-the-adversarial-question-then-narrow-the-answer -->
<!-- vpmodule:atom:begin do-not-mint-a-prohibition-a-dedicated-tool-already-owns -->
---
instruction_id: do-not-mint-a-prohibition-a-dedicated-tool-already-owns
title: Do not mint a prohibition a dedicated tool already owns
summary: "A canonical security or compliance constraint is a breadcrumb to the tool that owns it, not a newly minted prohibition."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: A surfaced constraint turns out to be a canonical security or compliance rule.
conditions_does_not_apply_when: The constraint is specific to this feature.
artifact_contract_output_type: canon-breadcrumb
artifact_contract_required_data:
  - the canonical rule
  - the tool that owns it
  - the one-line breadcrumb
artifact_contract_verified_by: no canonical rule was minted as a bespoke prohibition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not mint a prohibition a dedicated tool already owns
Some kept candidates are not bespoke at all — they are **canon** security/compliance constraints that a dedicated tool already owns. Do NOT mint a prohibition for them. Instead emit a one-line breadcrumb and stop
Minting canon items both duplicates other tooling and drowns the bespoke signal
<!-- vpmodule:atom:end do-not-mint-a-prohibition-a-dedicated-tool-already-owns -->
<!-- vpmodule:atom:begin recall-wide-then-filter-for-precision -->
---
instruction_id: recall-wide-then-filter-for-precision
title: "Recall wide, then filter for precision"
summary: "The adversarial recall stage deliberately over-produces and the precision stage filters the list in one pass, so the surviving list stays short and every entry carries signal."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The constraints a feature must never silently become are elicited from its requirements.
conditions_does_not_apply_when: The constraints are already written down.
artifact_contract_output_type: prohibition-list
artifact_contract_required_data:
  - the adversarial question asked per requirement
  - the raw candidates
  - the kept constraints
artifact_contract_verified_by: the list is short and every entry is an intent constraint rather than a routine engineering concern
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Recall wide, then filter for precision
**Stage 1 - Recall (adversarial probe).** Ask the single adversarial question of each requirement:
> *What could this feature silently become that the author would NOT want, but the spec
> does not forbid?*
This question is model-robust.
It deliberately over-produces: ~10 raw candidates per requirement, including routine engineering items. That over-production is intentional - recall first.
**Stage 2 - Precision (one-pass classifier).** Filter the raw Stage-1 list in a single pass.
- **DROP routine-engineering items** - anything that is a normal correctness or hygiene concern rather than an intent constraint
- **KEEP values / safety / ethics items** - anything that, if violated, makes the feature do something the author would object to on product, fairness, privacy, transparency, or safety grounds
A requirement that yields zero kept prohibitions emits an empty list - that is the correct precision outcome for a pure utility, not a failure.
<!-- vpmodule:atom:end recall-wide-then-filter-for-precision -->
<!-- vpmodule:atom:begin require-a-reason-for-every-dismissed-prohibition -->
---
instruction_id: require-a-reason-for-every-dismissed-prohibition
title: Require a reason for every dismissed prohibition
summary: "A dismissed constraint carries a non-empty reason; silence is not a resolution, and an unresolved one is carried forward and flagged."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A surfaced constraint is dismissed or left unresolved.
conditions_does_not_apply_when: The constraint was resolved.
artifact_contract_output_type: prohibition-lifecycle
artifact_contract_required_data:
  - the status
  - the reason
  - the flag
artifact_contract_verified_by: every dismissal carries a reason and every unresolved item is flagged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Require a reason for every dismissed prohibition
not a genuine prohibition for this feature, accompanied by a required, non-empty reason string. "N/A — this utility has no user-facing surface, no values constraint applies" is valid; silence is not. The reason string is the audit trail
carried forward and flagged; the author chose not to resolve it yet
<!-- vpmodule:atom:end require-a-reason-for-every-dismissed-prohibition -->
<!-- vpmodule:atom:begin surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion -->
---
instruction_id: surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion
title: Surface the omitted prohibition as an explicit acceptance criterion
summary: A constraint the author assumed but never wrote is written down as a checkable criterion before any code exists.
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A requirement is being written or reviewed.
conditions_does_not_apply_when: The requirement already carries its prohibitions explicitly.
artifact_contract_output_type: prohibition-criterion
artifact_contract_required_data:
  - the prohibition
  - the acceptance criterion it becomes
artifact_contract_verified_by: the omitted prohibition is written as a checkable criterion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Surface the omitted prohibition as an explicit acceptance criterion
The fix is not a better verifier; it is **spec completeness**: surface the omitted prohibition into an explicit, checkable acceptance criterion *before* any code exists, after which the verifier reliably enforces it
A goal-backward verifier only checks assertions that exist; an assertion only exists for a requirement that was written down
The class of constraint this probe targets — the *"must-NOT"* the author assumed but never wrote — is invisible to the verifier in exactly the same way an omitted edge is, but with a sharper failure mode
<!-- vpmodule:atom:end surface-the-omitted-prohibition-as-an-explicit-acceptance-criterion -->