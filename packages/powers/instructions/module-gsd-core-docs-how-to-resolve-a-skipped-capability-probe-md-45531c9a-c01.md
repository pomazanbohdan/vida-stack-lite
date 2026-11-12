---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-a-skipped-capability-probe-md-45531c9a-c01"
title: "gsd-core: docs/how-to/resolve-a-skipped-capability-probe.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/resolve-a-skipped-capability-probe.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-a-skipped-capability-probe.md\"}"
atom_ids:
  - tell-nothing-to-report-apart-from-could-not-look
  - turning-the-gate-off-does-not-answer-the-question
atom_count: 2
atoms: "[{\"atom_id\":\"tell-nothing-to-report-apart-from-could-not-look\",\"file_sha256\":\"1d2c3c3865fac320a388476042f865bbf530b587d12bfe2812df84de984a66e7\",\"content_sha256\":\"53fccdf0cc18e821faba6f206fc924935c61789fea46deb5430b1ac7c90147a0\",\"file_bytes\":1728,\"body_bytes\":469},{\"atom_id\":\"turning-the-gate-off-does-not-answer-the-question\",\"file_sha256\":\"b60873b961288fca97dfd516a38e6c4fab291640fec665187708bb7627f50e7b\",\"content_sha256\":\"1e10136889328be38373b62be3596ab5cc783fd31b996d19b77d400af947cba0\",\"file_bytes\":1257,\"body_bytes\":162}]"
carrier_sha256: 0f04b272272a7126194b2238053102bbb0fa5fee568870249c38209cd3be78d6
carrier_bytes: 3294
revision: 1
status: active
---
<!-- vpmodule:atom:begin tell-nothing-to-report-apart-from-could-not-look -->
---
instruction_id: tell-nothing-to-report-apart-from-could-not-look
title: Tell nothing to report apart from could not look
summary: "A verdict that found nothing and a verdict that examined nothing are different outcomes, and only one of them is good news."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check reports a negative result and the reason for it is not stated.
conditions_does_not_apply_when: The check ran and examined real input.
artifact_contract_output_type: check-outcome
artifact_contract_required_data:
  - the outcome
  - the distinction between an empty result and an unexamined input
artifact_contract_verified_by: the outcome states whether real input was examined
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-a-skipped-capability-probe.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell nothing to report apart from could not look
A verdict of `detected: false` or `passed: true` means the detector examined real text and found nothing.
A `skipped` payload or a `scope_unavailable` block means the detector examined nothing at all.
Only the first is good news; the second is a request for more scope, not a clean bill of health.
Tell "nothing to report" apart from "could not look" — they are different outcomes and only one of them is good news.
<!-- vpmodule:atom:end tell-nothing-to-report-apart-from-could-not-look -->
<!-- vpmodule:atom:begin turning-the-gate-off-does-not-answer-the-question -->
---
instruction_id: turning-the-gate-off-does-not-answer-the-question
title: Turning the gate off does not answer the question
summary: Switching a gate off silences the hold; the question the gate asked stays unanswered.
capability_tags:
  - verify-work-results
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A gate holds a phase and the gate is about to be switched off.
conditions_does_not_apply_when: The scope is resolved so the gate clears on its own.
artifact_contract_output_type: gate-disposition
artifact_contract_required_data:
  - the gate
  - the scope that is still undecided
artifact_contract_verified_by: the scope is resolved or the reasoned declaration is written instead of the gate being switched off
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-a-skipped-capability-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Turning the gate off does not answer the question
**Turning the gate off does not answer the question.**
Prefer resolving the scope or writing the declaration.
<!-- vpmodule:atom:end turning-the-gate-off-does-not-answer-the-question -->