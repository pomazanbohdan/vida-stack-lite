---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-honest-verifier-md-d068c3b0-c01"
title: "gsd-core: gsd-core/references/honest-verifier.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/references/honest-verifier.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/honest-verifier.md\"}"
atom_ids:
  - abstain-when-the-check-is-not-derivable-from-the-spec
  - abstain-when-the-check-is-not-inferable
  - never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it
  - route-the-abstention-on-an-external-trigger-not-on-self-judgment
  - route-the-abstention-on-the-external-marker-not-on-self-doubt
atom_count: 5
atoms: "[{\"atom_id\":\"abstain-when-the-check-is-not-derivable-from-the-spec\",\"file_sha256\":\"20a5c9ee004235d57494319f116cd89be0c15f259920ce6456cae218ae5a19ec\",\"content_sha256\":\"aca8fa5e473842bff10b1dbfc58cba2fdb88f7042337c6c4d06f8d5c8aeee3d4\",\"file_bytes\":2077,\"body_bytes\":937},{\"atom_id\":\"abstain-when-the-check-is-not-inferable\",\"file_sha256\":\"32785b79e6a545ff763f499d6fca7c19d19f9605c0c473cd3765788902f7ca97\",\"content_sha256\":\"aba75387a62ae7439101f94ffea618de73287ef1cb4c0c63eae065c7cd9cd391\",\"file_bytes\":2238,\"body_bytes\":1030},{\"atom_id\":\"never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it\",\"file_sha256\":\"1e2574142b3a45e74bbcd5755d3bfc8ea6d4c7548e45a5698ee5b01a0c1e6b94\",\"content_sha256\":\"89cac87e814b255e1440ae9dc014d2f3d82fd8bfb47c6c9a7f44472bd92e108a\",\"file_bytes\":1806,\"body_bytes\":500},{\"atom_id\":\"route-the-abstention-on-an-external-trigger-not-on-self-judgment\",\"file_sha256\":\"ee92b9502618ac54688b1494d981fac5ea9fd10564c8987ffa462664bdc6db09\",\"content_sha256\":\"267f57bab6d6f0a7ec0672ffd3fd33deaf3ca667250ac2ba08fc646ee7e68cac\",\"file_bytes\":2444,\"body_bytes\":1166},{\"atom_id\":\"route-the-abstention-on-the-external-marker-not-on-self-doubt\",\"file_sha256\":\"372e5528dc5ccdf544ee15aea578c892198f5fc756ac21cde559e6687c84e711\",\"content_sha256\":\"d79a1c33ff693d10222d3959dfc85a34bbc35cd9769369228bbd395eea2f9881\",\"file_bytes\":1701,\"body_bytes\":616}]"
carrier_sha256: 78ee195d240db9dd1a6d3cdefc980f9385981bb0654d2e0bf457e458b42cfa05
carrier_bytes: 11121
revision: 1
status: active
---
<!-- vpmodule:atom:begin abstain-when-the-check-is-not-derivable-from-the-spec -->
---
instruction_id: abstain-when-the-check-is-not-derivable-from-the-spec
title: Abstain when the check is not derivable from the spec
summary: "A check whose answer cannot be derived from the written spec is abstained on, never passed on confidence."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check has been tagged as not derivable from the written spec.
conditions_does_not_apply_when: The check is inferable from the stated spec and is graded normally.
artifact_contract_output_type: abstention-disposition
artifact_contract_required_data:
  - the abstained item
  - the evidence that was looked for
  - the abstention reason
artifact_contract_verified_by: the item is not marked passed and carries the abstention reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Abstain when the check is not derivable from the spec
A verifier is trustworthy on inferable checks — defects determined by the stated spec. On a non-inferable check the correct answer is not derivable from the spec alone
Explicit evidence = a wired held-out/property-based test that passes, or a behavior the verifier directly observed. Symbol presence + wiring is not explicit evidence for a non-inferable truth
Never silent, never a hard halt. Interactive: the abstained item routes to the end-of-phase human checkpoint. Autonomous (AFK): it produces a prominent `unverified — held-out test recommended` flag and the completion line reads "complete with N unverified non-inferable checks"; the run neither silently passes the blind spot nor hard-halts
Distinguishable reason. The abstain disposition carries `reason: insufficient_spec` so the `human_needed` outcome is never conflated with an ordinary manual-UAT `human_needed`
<!-- vpmodule:atom:end abstain-when-the-check-is-not-derivable-from-the-spec -->
<!-- vpmodule:atom:begin abstain-when-the-check-is-not-inferable -->
---
instruction_id: abstain-when-the-check-is-not-inferable
title: Abstain when the check is not inferable
summary: "On a check whose answer is not derivable from the spec, the verifier abstains instead of reporting a confident pass; the item is never marked passed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check on a requirement cannot be decided from the stated spec alone.
conditions_does_not_apply_when: The check is inferable from the spec and is graded normally.
artifact_contract_output_type: abstention
artifact_contract_required_data:
  - the check that is not inferable
  - "the explicit evidence that was found, if any"
  - the distinguishable reason
artifact_contract_verified_by: the item was abstained on with a distinguishable reason and never reported as passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Abstain when the check is not inferable
A verifier is trustworthy on **inferable** checks - defects determined by the stated spec. On a **non-inferable** check the correct answer is *not derivable from the spec alone* (e.g. "does `[1,2]` touching `[2,3]` merge?", "is a 'character' a grapheme or a code unit?"). On these the verifier *does not know that it does not know*: measured behavior is a **confident PASS on the blind-spot check ~100% of the time** (mean confidence ~0.93), because a model cannot self-detect a gap it does not perceive.
- **Explicit evidence** = a wired held-out/property-based test that passes, or a behavior the verifier directly observed. Symbol presence + wiring is **not** explicit evidence for a non-inferable truth.
- **Distinguishable reason.** The abstain disposition carries `reason: insufficient_spec` so the `human_needed` outcome is never conflated with an ordinary manual-UAT `human_needed`.
- **abstain** → ⚠️ `insufficient_spec`, flagged, → `human_needed` — **never `passed`**
<!-- vpmodule:atom:end abstain-when-the-check-is-not-inferable -->
<!-- vpmodule:atom:begin never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it -->
---
instruction_id: never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it
title: Never silently pass an unverifiable item and never hard-halt on it
summary: "An abstained item is neither silently passed nor a hard halt: interactive runs route it to the human checkpoint, unattended runs flag it prominently and say so in the completion line."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - unattended-execution
conditions_applies_when: An item was abstained on and the run has to continue.
conditions_does_not_apply_when: The item was decided with explicit evidence.
artifact_contract_output_type: abstention-disposition
artifact_contract_required_data:
  - the flag raised for the abstained item
  - the route it took in this run mode
  - the completion line
artifact_contract_verified_by: "the abstained item is flagged, the completion line names the unverified count, and the run did not halt on it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never silently pass an unverifiable item and never hard-halt on it
- **Never silent, never a hard halt.** *Interactive:* the abstained item routes to the end-of-phase human checkpoint. *Autonomous (AFK):* it produces a prominent `unverified - held-out test recommended` flag and the completion line reads "complete with N unverified non-inferable checks"; the run neither silently passes the blind spot nor hard-halts.
-> VERIFIED / ✗ FAILED as usual; **never abstained** (over-abstention guard)
<!-- vpmodule:atom:end never-silently-pass-an-unverifiable-item-and-never-hard-halt-on-it -->
<!-- vpmodule:atom:begin route-the-abstention-on-an-external-trigger-not-on-self-judgment -->
---
instruction_id: route-the-abstention-on-an-external-trigger-not-on-self-judgment
title: "Route the abstention on an external trigger, not on self-judgment"
summary: "The abstention is triggered by the external tag that marks the check as non-inferable, never by the verifier's own confidence; the verifier routes, it does not diagnose."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verifier has to decide what to do with a check that may not be inferable.
conditions_does_not_apply_when: The check carries no external trigger and the verifier is asked for a plain verdict.
artifact_contract_output_type: abstention-routing
artifact_contract_required_data:
  - the external trigger the routing used
  - the verdict the verifier stated
artifact_contract_verified_by: the routing followed the external trigger and the verdict names no omitted rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Route the abstention on an external trigger, not on self-judgment
1. **Exogenous, not endogenous.** The trigger is the *external tag* (`backstop`), never the verifier's self-judgment. Asking the verifier to "abstain if unsure" barely moves the number (100% → 67%) and only on ambiguity it already notices; on a true blind spot it stays confidently wrong. A confidence gate cannot reach a blind spot the model does not feel - so there is **no "are you sure?" prompt**; routing is on the pre-existing tag only.
2. **Routing, not diagnosis.** The verifier need not name the omitted rule (if it could, it wouldn't be a blind spot). In testing, verifiers abstained correctly while citing the *wrong* edge. The honest verdict requires only "I was told this is under-specified and I cannot rule it out." The omitted rule is carried by a human-authored held-out test, not by the verifier.
Does NOT identify the omitted rule; does NOT recalibrate decisive verdicts; does NOT defend against *malicious compliance* (a self-graded review rationalizing away its own findings). It raises the floor on *honest* uncertainty about non-inferable checks - that is the whole claim.
<!-- vpmodule:atom:end route-the-abstention-on-an-external-trigger-not-on-self-judgment -->
<!-- vpmodule:atom:begin route-the-abstention-on-the-external-marker-not-on-self-doubt -->
---
instruction_id: route-the-abstention-on-the-external-marker-not-on-self-doubt
title: "Route the abstention on the external marker, not on self-doubt"
summary: The abstention trigger is the external marker that already exists; no self-assessment prompt is used.
capability_tags:
  - verify-work-results
pattern_tags:
  - scope-routing
conditions_applies_when: A check must be routed to an abstention or a verdict.
conditions_does_not_apply_when: No external marker exists for the check and it is graded by the spec.
artifact_contract_output_type: abstention-routing
artifact_contract_required_data:
  - the external marker
  - the routing decision
artifact_contract_verified_by: the routing follows the external marker alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Route the abstention on the external marker, not on self-doubt
Exogenous, not endogenous. The trigger is the *external tag* (`backstop`), never the verifier's self-judgment
A confidence gate cannot reach a blind spot the model does not feel — so there is no "are you sure?" prompt; routing is on the pre-existing tag only
Routing, not diagnosis. The verifier need not name the omitted rule (if it could, it wouldn't be a blind spot)
The honest verdict requires only "I was told this is under-specified and I cannot rule it out."
The omitted rule is carried by a human-authored held-out test, not by the verifier
<!-- vpmodule:atom:end route-the-abstention-on-the-external-marker-not-on-self-doubt -->