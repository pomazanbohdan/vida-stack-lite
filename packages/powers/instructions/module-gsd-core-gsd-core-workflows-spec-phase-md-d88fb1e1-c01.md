---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-spec-phase-md-d88fb1e1-c01"
title: "gsd-core: gsd-core/workflows/spec-phase.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/spec-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/spec-phase.md\"}"
atom_ids:
  - ask-before-you-write-an-empty-section
  - flag-what-is-still-unresolved-as-an-assumption
  - gate-the-spec-on-a-quantified-clarity-score
  - keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language
  - make-every-acceptance-criterion-pass-or-fail
  - re-score-after-every-round-and-flag-what-is-still-unclear
  - recall-then-filter-for-the-prohibition-axis
  - refer-a-canon-control-instead-of-minting-a-duplicate
atom_count: 8
atoms: "[{\"atom_id\":\"ask-before-you-write-an-empty-section\",\"file_sha256\":\"bc08a1690e501e0dca7187727c782ed464945574f16939fbf407b2128999a8f8\",\"content_sha256\":\"8d5faf3b2f64d42e34a7084733e7dcc0b0362f15877852f4555819123008b709\",\"file_bytes\":1360,\"body_bytes\":187},{\"atom_id\":\"flag-what-is-still-unresolved-as-an-assumption\",\"file_sha256\":\"4af6051eec652015c5688a1125defa85bdc2309bb01922c858fdbf1fcc8f2404\",\"content_sha256\":\"64df0783c08dd94c8baed2d21c01d2b925e6319d99ef9848b28e1151e8cba06b\",\"file_bytes\":1432,\"body_bytes\":377},{\"atom_id\":\"gate-the-spec-on-a-quantified-clarity-score\",\"file_sha256\":\"96b3e63f4751ef9e36d1aab138d71bb42d907153f719792655496a2528848af7\",\"content_sha256\":\"d3edace786b3eedcc9ae67946e71a73e973d7e7e0dd3a8521181eafb7d7c3771\",\"file_bytes\":1541,\"body_bytes\":429},{\"atom_id\":\"keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language\",\"file_sha256\":\"f5d00f265d6c7f343c6a395071550c3b19b0fdb0aec7ba2bedfaab7aa9e5f918\",\"content_sha256\":\"97151d6c3a5d7e5897a089a452b34a5a0d55696ddfe32afaef159cab464c888c\",\"file_bytes\":1915,\"body_bytes\":590},{\"atom_id\":\"make-every-acceptance-criterion-pass-or-fail\",\"file_sha256\":\"f2427339a636da5037042bcb9dcea00411eace3cc17854ebcb8c54d6e9940e4b\",\"content_sha256\":\"e3e79166a4f24d6c87da21950d376ef7ea6354c524500c4df25d5c66ac835840\",\"file_bytes\":1225,\"body_bytes\":214},{\"atom_id\":\"re-score-after-every-round-and-flag-what-is-still-unclear\",\"file_sha256\":\"36da978b398517123035f0a50cda810a4d6ac305d9bc91f8ad599e99704bd96d\",\"content_sha256\":\"e8ee9efe2e7369c5d17339819fc8ef751b8fca14fba8d30e1f8d00ce7d811622\",\"file_bytes\":1584,\"body_bytes\":434},{\"atom_id\":\"recall-then-filter-for-the-prohibition-axis\",\"file_sha256\":\"d589337f19c276cc1d3fcd6b925c8a98bc1adeb1f6c4a2e46a666b10ade0acdf\",\"content_sha256\":\"c69ae5254c4f05760b1279c2f7364ad4b7fca08543f4fc18a6bea25db965fa65\",\"file_bytes\":1859,\"body_bytes\":736},{\"atom_id\":\"refer-a-canon-control-instead-of-minting-a-duplicate\",\"file_sha256\":\"61730e0045b87ed37517fc9af62543ce62a30650b9fbb9900876dab4c2b9e8c5\",\"content_sha256\":\"9183c9af56ad9abbce4c3df41518f300dea842414d3dfab6c8515560b136783a\",\"file_bytes\":1410,\"body_bytes\":254}]"
carrier_sha256: 16d00941e5b71598f726b4a349cc8e799285e772298645881574e5a9c294bede
carrier_bytes: 13597
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-before-you-write-an-empty-section -->
---
instruction_id: ask-before-you-write-an-empty-section
title: Ask before you write an empty section
summary: A detector that proposes nothing is far more likely to have missed something than to have found an edge-free subject; the author confirms before an empty section is written.
capability_tags:
  - harden-validation
pattern_tags:
  - empty-result-policy
conditions_applies_when: A detector returned no applicable rows and an empty section would be written.
conditions_does_not_apply_when: The detector is known to be complete.
artifact_contract_output_type: empty-section-decision
artifact_contract_required_data:
  - the empty report
  - the confirmation that it is really empty
  - the section that is written
artifact_contract_verified_by: the author confirmed the emptiness explicitly before the empty section was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ask before you write an empty section
do NOT proceed silently: ask the author to confirm via AskUserQuestion
Only write an empty `## Edge Coverage` section after explicit confirmation.
<!-- vpmodule:atom:end ask-before-you-write-an-empty-section -->
<!-- vpmodule:atom:begin flag-what-is-still-unresolved-as-an-assumption -->
---
instruction_id: flag-what-is-still-unresolved-as-an-assumption
title: Flag what is still unresolved as an assumption
summary: An unresolved row is written down and marked as an assumption the next step has to treat as such; it is never skipped silently.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A document is written while some of its rows are still open.
conditions_does_not_apply_when: Everything was resolved.
artifact_contract_output_type: flagged-assumptions
artifact_contract_required_data:
  - the unresolved rows
  - the assumption each one forces
artifact_contract_verified_by: every unresolved row is marked as an assumption in the written document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Flag what is still unresolved as an assumption
On "anyway": write SPEC.md with those rows marked `⚠ Edge unresolved — planner must treat as assumption`.
On "anyway": write SPEC.md with those rows marked `⚠ Prohibition unresolved — planner must treat as assumption`. This is a soft gate (write-anyway-with-flags), never a silent skip — the soft gate IS the control.
<!-- vpmodule:atom:end flag-what-is-still-unresolved-as-an-assumption -->
<!-- vpmodule:atom:begin gate-the-spec-on-a-quantified-clarity-score -->
---
instruction_id: gate-the-spec-on-a-quantified-clarity-score
title: Gate the spec on a quantified clarity score
summary: The clarity of a request is scored on weighted dimensions; the specification is written only when the aggregate and every dimension clear their thresholds.
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: A specification is about to be written from a conversation.
conditions_does_not_apply_when: The requirements are already written down and settled.
artifact_contract_output_type: clarity-score
artifact_contract_required_data:
  - the dimension scores
  - the weighted aggregate
  - the thresholds
artifact_contract_verified_by: the aggregate and every dimension are at or above their thresholds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Gate the spec on a quantified clarity score
Score each dimension 0.0 (completely unclear) to 1.0 (crystal clear):
**Ambiguity score** = 1.0 − (0.35×goal + 0.25×boundary + 0.20×constraint + 0.20×acceptance)
**Gate:** ambiguity ≤ 0.20 AND all dimensions ≥ their minimums → ready to write SPEC.md.
A score of 0.20 means 80% weighted clarity — enough precision that the planner won't silently make wrong assumptions.
<!-- vpmodule:atom:end gate-the-spec-on-a-quantified-clarity-score -->
<!-- vpmodule:atom:begin keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language -->
---
instruction_id: keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language
title: "Keep the engine input in the engine language and the document in the user's language"
summary: "A machine classifier that matches on English cues gets an English copy of every entry as its input, while the document itself keeps the user's own language and its identifiers are never translated."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document is written in one language and is fed to a machine classifier that matches on another one.
conditions_does_not_apply_when: The document and the classifier use the same language.
artifact_contract_output_type: machine-input
artifact_contract_required_data:
  - the original text
  - the classifier-facing translation
  - the unchanged identifiers
artifact_contract_verified_by: the document keeps its original language and only the machine input is translated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Keep the engine input in the engine language and the document in the user's language
add an optional `text_en` key to each `$REQS_JSON` entry: a faithful **English** translation of that requirement's `text`.
`text_en` is **engine input, never user-facing output**
`text` itself is NOT translated: write it as the requirement's own text, exactly as it appears in the SPEC.
The SPEC keeps the original language — only `text_en` is translated, and requirement `id`s are never translated or renumbered
Populate `text_en` for **every** requirement, not only the ones that look edge-relevant
<!-- vpmodule:atom:end keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language -->
<!-- vpmodule:atom:begin make-every-acceptance-criterion-pass-or-fail -->
---
instruction_id: make-every-acceptance-criterion-pass-or-fail
title: Make every acceptance criterion pass or fail
summary: An acceptance criterion is a checkbox that can be decided; a subjective phrase is not a criterion.
capability_tags:
  - define-quality-bar
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for a piece of work.
conditions_does_not_apply_when: The work has no acceptance criteria.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the criteria
  - the observable condition each one decides
artifact_contract_verified_by: every criterion can be decided as passed or failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make every acceptance criterion pass or fail
**Acceptance criteria must be pass/fail checkboxes** — no "should feel good" or "looks reasonable."
Acceptance criteria must be pass/fail — no subjective criteria
<!-- vpmodule:atom:end make-every-acceptance-criterion-pass-or-fail -->
<!-- vpmodule:atom:begin re-score-after-every-round-and-flag-what-is-still-unclear -->
---
instruction_id: re-score-after-every-round-and-flag-what-is-still-unclear
title: Re-score after every round and flag what is still unclear
summary: After every round of questions the dimensions are re-scored and shown; when the round budget runs out the document is written with the open dimensions marked as assumptions.
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: An interview runs in rounds towards a quantified clarity threshold.
conditions_does_not_apply_when: The interview is a single round.
artifact_contract_output_type: scored-rounds
artifact_contract_required_data:
  - the round
  - the updated scores
  - the dimensions below their minimum
artifact_contract_verified_by: every round was re-scored and shown and the open dimensions are marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Re-score after every round and flag what is still unclear
After each round:
Update all 4 dimension scores from the user's answers
Calculate new ambiguity score
Display the updated scoring:
**If max rounds reached (6) and gate not passed:**
Write SPEC.md anyway — flag unresolved dimensions.
**If any dimensions are below minimum**, mark them in the Ambiguity Report with: `⚠ Below minimum — planner must treat as assumption`.
<!-- vpmodule:atom:end re-score-after-every-round-and-flag-what-is-still-unclear -->
<!-- vpmodule:atom:begin recall-then-filter-for-the-prohibition-axis -->
---
instruction_id: recall-then-filter-for-the-prohibition-axis
title: Recall then filter for the prohibition axis
summary: "The must-not axis is worked in two passes: over-produce the candidates first, then filter them in a single pass down to the ones that name a real harm."
capability_tags:
  - harden-security-controls
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The things a feature must not become have to be enumerated.
conditions_does_not_apply_when: The prohibitions are already written down.
artifact_contract_output_type: prohibition-set
artifact_contract_required_data:
  - the raw candidates
  - the candidates kept
  - the reason each was kept
artifact_contract_verified_by: the raw list was over-produced first and the kept list holds only genuine harms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Recall then filter for the prohibition axis
**Stage 1 — Recall (adversarial prose probe).** Ask the single adversarial question of the requirement: *"What could this feature silently become that the author would NOT want, but the spec does not forbid?"*
Over-produce (~10 raw must-NOT candidates) — recall first.
**Stage 2 — Precision (one-pass classifier).** Filter the raw list in a single pass:
**DROP routine-engineering** items (normal correctness/hygiene — "must not mutate input", "must not throw on empty" — owned by the edge probe or code review); **KEEP values / safety / ethics** items (manipulative framing, protected-attribute proxies, raw PII in plaintext).
This collapses ~10 → ~2–3 genuine prohibitions.
<!-- vpmodule:atom:end recall-then-filter-for-the-prohibition-axis -->
<!-- vpmodule:atom:begin refer-a-canon-control-instead-of-minting-a-duplicate -->
---
instruction_id: refer-a-canon-control-instead-of-minting-a-duplicate
title: Refer a canon control instead of minting a duplicate
summary: "A candidate that a canon process already owns is referred to that process in one line and dropped, instead of being written a second time."
capability_tags:
  - harden-security-controls
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "A prohibition candidate turns out to be owned by another, already existing control."
conditions_does_not_apply_when: The candidate is specific to this piece of work.
artifact_contract_output_type: canon-referral
artifact_contract_required_data:
  - the candidate
  - the process that owns it
  - the one-line breadcrumb
artifact_contract_verified_by: the canon item was referred and not written a second time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
---

# Refer a canon control instead of minting a duplicate
A kept candidate that is canon security/compliance (OWASP / prototype-pollution / path-traversal / injection / GDPR / generic fairness) is NOT minted here — emit a one-line breadcrumb and DROP it.
<!-- vpmodule:atom:end refer-a-canon-control-instead-of-minting-a-duplicate -->