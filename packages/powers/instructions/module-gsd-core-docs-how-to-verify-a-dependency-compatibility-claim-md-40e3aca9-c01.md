---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-verify-a-dependency-compatibility-claim-md-40e3aca9-c01"
title: "gsd-core: docs/how-to/verify-a-dependency-compatibility-claim.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:docs/how-to/verify-a-dependency-compatibility-claim.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/verify-a-dependency-compatibility-claim.md\"}"
atom_ids:
  - an-absence-of-metadata-binds-nothing
  - an-unrunnable-probe-costs-a-checkpoint-not-a-block
  - paste-the-probe-output-not-a-summary
  - probe-the-capability-the-claim-is-about-not-just-the-import
  - tell-a-declared-constraint-apart-from-a-missing-field
atom_count: 5
atoms: "[{\"atom_id\":\"an-absence-of-metadata-binds-nothing\",\"file_sha256\":\"7381bdec3a79ddb7c94f7079ef4834c2331b3d7396b4a45920bdd0c9e9b065a5\",\"content_sha256\":\"c4edc5ff48e96b76800cc58962aeaf228d86a719f4e8ecf41e336092b6a63af0\",\"file_bytes\":1788,\"body_bytes\":641},{\"atom_id\":\"an-unrunnable-probe-costs-a-checkpoint-not-a-block\",\"file_sha256\":\"511023beb4d76bd5c4234693d5f2f38159ee2c5b2b88c5cf920dfeb33700d1d1\",\"content_sha256\":\"a5b8feb365c7cb2231563e9187e93e59421e273fec21be0631aeff8057d9a821\",\"file_bytes\":1718,\"body_bytes\":583},{\"atom_id\":\"paste-the-probe-output-not-a-summary\",\"file_sha256\":\"87c7dd13f5a92b217e69d50a0a7ea2337141de113cdcfdab6789bb199de5c4c3\",\"content_sha256\":\"3aff6b5ef7138b9549536d3126008dbbb83bd44f0ce33d0f65cefc7a6775fdea\",\"file_bytes\":1316,\"body_bytes\":306},{\"atom_id\":\"probe-the-capability-the-claim-is-about-not-just-the-import\",\"file_sha256\":\"fa590c46c0b7e476057a778315f8d0d869de6fce824038c2d736c5bc5e54aaac\",\"content_sha256\":\"ea0d6e2db35368c9962b4fe2632d4a8700186a8cb9eee189d7d4f6a0262b5fca\",\"file_bytes\":1882,\"body_bytes\":676},{\"atom_id\":\"tell-a-declared-constraint-apart-from-a-missing-field\",\"file_sha256\":\"3ba6ce9d5383ff6ba2f70349da50eb0707ab109fc3aa250acddf31b3049ec00c\",\"content_sha256\":\"c1676ce94508f95feaf388e27506f0b911fcac9ff1fe198a286584fa640a1c77\",\"file_bytes\":1592,\"body_bytes\":479}]"
carrier_sha256: da4c3385c4ee397ee91505c8d42071dd4df4ee4371f4fc5d5116939d499cb4c3
carrier_bytes: 9053
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-absence-of-metadata-binds-nothing -->
---
instruction_id: an-absence-of-metadata-binds-nothing
title: An absence of metadata binds nothing
summary: A project that declares no supported version constrains neither the version you rule out nor the one you standardise on.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A compatibility claim rests on a field the upstream does not publish.
conditions_does_not_apply_when: The upstream publishes a constraint that decides the question.
artifact_contract_output_type: compatibility-claim
artifact_contract_required_data:
  - the missing field
  - the versions the absence says nothing about
artifact_contract_verified_by: the claim is not treated as a constraint and no version bound is taken from the absence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - research
---

# An absence of metadata binds nothing
A project that declares no supported versions has said nothing about the version you are ruling out *and* nothing about the version you are standardizing on. The same evidence would "prove" both, so it settles neither.
An absence in the docs is not this. "The docs do not mention 3.14" is the same silence you started with.
That is the same inference with the sign flipped, and it fails for the same reason. If you want to standardize *on* a version, the evidence for that is a declared constraint that covers it, a matching classifier, or a probe that succeeds — never the absence of a prohibition.
<!-- vpmodule:atom:end an-absence-of-metadata-binds-nothing -->
<!-- vpmodule:atom:begin an-unrunnable-probe-costs-a-checkpoint-not-a-block -->
---
instruction_id: an-unrunnable-probe-costs-a-checkpoint-not-a-block
title: "An unrunnable probe costs a checkpoint, not a block"
summary: A probe that cannot run leaves the claim unlocked and costs a confirmation checkpoint; confirming it at the checkpoint is not allowed.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A probe cannot be run in this environment.
conditions_does_not_apply_when: The probe can be run.
artifact_contract_output_type: unlocked-claim
artifact_contract_required_data:
  - the claim left unlocked
  - the checkpoint that carries the confirmation
artifact_contract_verified_by: the claim is left unlocked and the checkpoint asks for the confirmation instead of asserting it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# An unrunnable probe costs a checkpoint, not a block
The claim still reaches the planner and can still shape a plan — it simply cannot become a locked `CONTEXT.md` decision that downstream phases treat as settled.
**A probe you cannot run costs you a confirmation checkpoint, not a blocked plan.**
**What you should *not* do is confirm the claim at the checkpoint to make the prompt go away.** Confirming is you asserting the premise on your own authority; it will be treated as settled by every phase after this one, and the checkpoint is the last place anybody will look at it.
<!-- vpmodule:atom:end an-unrunnable-probe-costs-a-checkpoint-not-a-block -->
<!-- vpmodule:atom:begin paste-the-probe-output-not-a-summary -->
---
instruction_id: paste-the-probe-output-not-a-summary
title: "Paste the probe output, not a summary"
summary: The output is what makes the claim checkable; a claim that a probe was run is as unfalsifiable as the absence it replaced.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A probe has been run and its result is recorded.
conditions_does_not_apply_when: No probe was run.
artifact_contract_output_type: probe-evidence
artifact_contract_required_data:
  - the raw output of the probe
artifact_contract_verified_by: the raw output sits beside the claim instead of a summary of it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Paste the probe output, not a summary
Then paste the **output** — not a summary of it, and not an assertion that you ran it — beside the claim in RESEARCH.md.
The output is what makes the tag checkable; a claim that a probe was run is exactly as unfalsifiable as the absence it was meant to replace.
<!-- vpmodule:atom:end paste-the-probe-output-not-a-summary -->
<!-- vpmodule:atom:begin probe-the-capability-the-claim-is-about-not-just-the-import -->
---
instruction_id: probe-the-capability-the-claim-is-about-not-just-the-import
title: "Probe the capability the claim is about, not just the import"
summary: "The probe exercises the capability the claim is about, and a failure that comes from the environment is fixed rather than banked."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - verification-harness
conditions_applies_when: A compatibility claim is about to be probed.
conditions_does_not_apply_when: The claim is already backed by a positive statement in the upstream documentation.
artifact_contract_output_type: compatibility-probe
artifact_contract_required_data:
  - the capability the probe exercises
  - the result
  - the attribution of a failure
artifact_contract_verified_by: the probe exercised the capability and a failure is attributed to the incompatibility
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Probe the capability the claim is about, not just the import
**It must exercise the capability the claim is about.** `import ldap3` succeeding on 3.14 says nothing about whether `bind()` and `search()` work.
**A failure must be attributable to the incompatibility.** If the probe fails because a certificate is missing or the host is wrong, that is your environment failing, not the library. Fix the probe and rerun; do not bank the failure.
**A probe that succeeds refutes the claim.** Do not soften it to "probably fine" — remove it. A disproved claim left in place as `[ASSUMED]` still steers the plan, and nobody looks again at something that already carries a hedge.
<!-- vpmodule:atom:end probe-the-capability-the-claim-is-about-not-just-the-import -->
<!-- vpmodule:atom:begin tell-a-declared-constraint-apart-from-a-missing-field -->
---
instruction_id: tell-a-declared-constraint-apart-from-a-missing-field
title: Tell a declared constraint apart from a missing field
summary: A published bound is honoured and never re-probed; a lookup that failed is not an observation at all.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - evidence-analysis
conditions_applies_when: A compatibility claim is read before anything is done about it.
conditions_does_not_apply_when: The bound has already been verified by a probe.
artifact_contract_output_type: compatibility-case-classification
artifact_contract_required_data:
  - the case the claim falls into
  - the action each case calls for
artifact_contract_verified_by: the case is named before any probe is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell a declared constraint apart from a missing field
The rule targets metadata that is **missing**, never metadata that is merely **unfavorable** — so a declared upper bound is not weakened by any of this, and re-probing against it is wasted work.
| **The lookup itself failed** — registry 5xx, package not found, tool errored | *No observation.* This is not the same as "no field declared" | Retry the lookup first. Do not treat a failed lookup as evidence of anything |
<!-- vpmodule:atom:end tell-a-declared-constraint-apart-from-a-missing-field -->