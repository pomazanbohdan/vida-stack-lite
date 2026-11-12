---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-spike-wrap-up-md-82f2d98c-c01"
title: "gsd-core: gsd-core/workflows/spike-wrap-up.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/spike-wrap-up.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/spike-wrap-up.md\"}"
atom_ids:
  - carry-every-verdict-forward
  - scope-the-packaged-requirements-to-the-ideas-you-wrapped
  - write-a-durable-agent-brief
atom_count: 3
atoms: "[{\"atom_id\":\"carry-every-verdict-forward\",\"file_sha256\":\"ae3b3717f1092671b65259bb2dee9a6173bf2c9a1764382512616ffc776346e2\",\"content_sha256\":\"128f2d7985977156c1daa2a8393fe0887a2958d6a0c0ec626ec3e58d42c6ac2e\",\"file_bytes\":1280,\"body_bytes\":178},{\"atom_id\":\"scope-the-packaged-requirements-to-the-ideas-you-wrapped\",\"file_sha256\":\"a90ca53b2a0eafd94aa1c65d2e8a091125abfe508ba66529e17c196849fb9d00\",\"content_sha256\":\"65e4bea7de0561a727b6ca39fe7f0045b2ace27b18af7a85ff1d2b6370cf6a06\",\"file_bytes\":1705,\"body_bytes\":559},{\"atom_id\":\"write-a-durable-agent-brief\",\"file_sha256\":\"0d337763e5a49fb8685fee82f0227d1cb77d48c3648b32f6068f2f2565c638dd\",\"content_sha256\":\"6313af1c3aa786e3e55b00fd86d7281dade897531beea77611fd2f95a565ade0\",\"file_bytes\":3199,\"body_bytes\":1880}]"
carrier_sha256: 7a82c15b4214d5ad8107f1dd30df01555ba3bf638475cc57f55b451e0ba17ce8
carrier_bytes: 6577
revision: 1
status: active
---
<!-- vpmodule:atom:begin carry-every-verdict-forward -->
---
instruction_id: carry-every-verdict-forward
title: Carry every verdict forward
summary: "A failed experiment is not discarded: a validated one carries proven patterns, a partial one carries constraints, and an invalidated one carries the landmine."
capability_tags:
  - curate-context
pattern_tags:
  - decision-trail
conditions_applies_when: The results of finished experiments are packaged for later work.
conditions_does_not_apply_when: Only the successful experiments are worth keeping.
artifact_contract_output_type: carried-verdicts
artifact_contract_required_data:
  - the verdict per experiment
  - what each verdict carries forward
artifact_contract_verified_by: "every experiment, including the invalidated ones, contributes what it carries forward"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Carry every verdict forward
**VALIDATED** spikes provide proven patterns
**PARTIAL** spikes provide constrained patterns
**INVALIDATED** spikes provide landmines and dead ends
<!-- vpmodule:atom:end carry-every-verdict-forward -->
<!-- vpmodule:atom:begin scope-the-packaged-requirements-to-the-ideas-you-wrapped -->
---
instruction_id: scope-the-packaged-requirements-to-the-ideas-you-wrapped
title: Scope the packaged requirements to the ideas you wrapped
summary: "The requirements that travel with a package are the ones of the ideas it actually covers, grouped by idea; the requirements of an unrelated idea never join them."
capability_tags:
  - curate-context
pattern_tags:
  - stable-identity
conditions_applies_when: Findings of several ideas are packaged together.
conditions_does_not_apply_when: The package covers exactly one idea.
artifact_contract_output_type: scoped-requirements
artifact_contract_required_data:
  - the idea per group
  - the requirements of those ideas
  - the grouping of the list
artifact_contract_verified_by: no requirement of an idea outside the package travelled with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Scope the packaged requirements to the ideas you wrapped
Non-negotiable design decisions pulled ONLY from the Requirements list of the idea key(s) that own the spikes in this feature-area group
Never include a requirement from an idea key that has no spike in this group.
Union of the Requirements lists for every idea key represented among the spikes being wrapped in this session — never the whole MANIFEST.md.
If this wrap-up spans more than one idea key, group the list by idea key so a future reader can tell which requirement belongs to which idea.
<!-- vpmodule:atom:end scope-the-packaged-requirements-to-the-ideas-you-wrapped -->
<!-- vpmodule:atom:begin write-a-durable-agent-brief -->
---
instruction_id: write-a-durable-agent-brief
title: Write a durable agent brief
summary: "Write an agent brief that stays useful as the code moves: behavioral not procedural, durable over precise, with complete acceptance criteria and explicit scope boundaries."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Work moves to a ready-for-agent state and another agent will pick it up.
conditions_does_not_apply_when: The work is done in the same session.
artifact_contract_output_type: agent-brief
artifact_contract_required_data:
  - current behavior
  - desired behavior
  - key interfaces
  - acceptance criteria
  - out of scope
artifact_contract_verified_by: "the brief names interfaces and behavior, cites no file paths or line numbers, and lists testable criteria"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/triage/AGENT-BRIEF.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Write a durable agent brief
An agent brief is a structured comment posted on an issue or PR when it moves to `ready-for-agent`. It is the authoritative specification that an AFK agent will work from. The original body and discussion are context: the agent brief is the contract.
The brief states **what the agent should do**, which stretches to both surfaces: for an issue, that's building the change from nothing; for a PR, it's what's left to do *to the existing diff*: finish it, close gaps, address review points. Same principles either way.
## Durability over precision
The issue may sit in `ready-for-agent` for days or weeks. The codebase will change in the meantime. Write the brief so it stays useful even as files are renamed, moved, or refactored.
- **Do** describe interfaces, types, and behavioral contracts
- **Do** name specific types, function signatures, or config shapes that the agent should look for or modify
- **Don't** reference file paths: they go stale
- **Don't** reference line numbers
- **Don't** assume the current implementation structure will remain the same
## Behavioral, not procedural
Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.
## Complete acceptance criteria
The agent needs to know when it's done. Every agent brief must have concrete, testable acceptance criteria. Each criterion should be independently verifiable.
## Explicit scope boundaries
State what is out of scope. This prevents the agent from gold-plating or making assumptions about adjacent features.
write a reference file at `references/[feature-area-name].md` as an **implementation blueprint** — it should read like a recipe, not a research paper.
A future build session should be able to follow this and build the feature correctly without re-spiking anything.
<!-- vpmodule:atom:end write-a-durable-agent-brief -->