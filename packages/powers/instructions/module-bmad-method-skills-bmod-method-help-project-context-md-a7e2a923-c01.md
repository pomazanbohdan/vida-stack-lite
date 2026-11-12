---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-project-context-md-a7e2a923-c01"
title: "bmad-method: skills/bmod-method/help/project-context.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/project-context.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/project-context.md\"}"
atom_ids:
  - keep-the-instructions-block-small
  - remove-a-rule-only-when-its-subject-is-gone
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-instructions-block-small\",\"file_sha256\":\"fed2a58f7c8fa509d247b63b28777588d6d0541394ca751de5e78445ca785dfb\",\"content_sha256\":\"ab512df9d41a56187041593d7997188c8ca874bb9a99a4e6f085a5ee2a84f79a\",\"file_bytes\":2069,\"body_bytes\":795},{\"atom_id\":\"remove-a-rule-only-when-its-subject-is-gone\",\"file_sha256\":\"ef030aefea927afcdedb2e6199224193a88a046cbd177b3b8e06c8536a2077d5\",\"content_sha256\":\"ff75976838a464ada5dfe541359c80c967a64ac5a4346e8d74b809ebdcad3373\",\"file_bytes\":1500,\"body_bytes\":327}]"
carrier_sha256: 286a3a024ac6dbe8247763f5399b61e202f7c366ee1300ac91c2c08de679cd9f
carrier_bytes: 3836
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-instructions-block-small -->
---
instruction_id: keep-the-instructions-block-small
title: Keep the instructions block small
summary: "Every line of the always-loaded block is paid in every session, so it holds only what the code cannot show: no overview, no tree, no stack list, no commands the obvious guess gets right."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The block of rules for agents is written or refreshed.
conditions_does_not_apply_when: The rules are a separate document that is fetched on demand.
artifact_contract_output_type: agent-guidance
artifact_contract_required_data:
  - the rules that stay
  - the reason each earns a line
artifact_contract_verified_by: every line in the block earns its place in every session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/project-context.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/agent-skills-bootstrap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep the instructions block small
Every line loads in every session, and agents follow instructions less well as the loaded set grows.
Agents read code better than prose about code, and a stored copy goes stale.
Instruction files that restate what the repo already shows cost tokens every session and do not make agents more successful.
Agents often skip context they must choose to fetch, so rules that must hold stay in the block.
Repo overviews, directory trees, stack lists, commands the obvious guess gets right, pasted code, history, and plans.
Product intent belongs in a spec
A scan finding alone becomes a question to the user.
Loading a second copy wastes context on runtimes where orchestrator-side injection also runs
The guard is what keeps the two seams from doubling the block.
<!-- vpmodule:atom:end keep-the-instructions-block-small -->
<!-- vpmodule:atom:begin remove-a-rule-only-when-its-subject-is-gone -->
---
instruction_id: remove-a-rule-only-when-its-subject-is-gone
title: Remove a rule only when its subject is gone
summary: "A policy or a pitfall leaves the rules file only when the thing it guards is gone or the user retires it; the absence of recent failures is not a reason, and a human-written rule needs one of the stated grounds."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A rule in the instructions file is being removed.
conditions_does_not_apply_when: The rule is being changed rather than removed.
artifact_contract_output_type: rule-removal
artifact_contract_required_data:
  - the rule
  - what it guards
  - the reason it may go
artifact_contract_verified_by: "the rule was removed for a stated reason, not for the absence of recent failures"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/project-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Remove a rule only when its subject is gone
A policy or pitfall goes only when the thing it guards is gone or the user retires it.
No recent failures is not a reason.
An instruction a human wrote is deleted only when it is stale or wrong, enforced by a hook or check, contradictory, or approved for deletion as its own item.
<!-- vpmodule:atom:end remove-a-rule-only-when-its-subject-is-gone -->