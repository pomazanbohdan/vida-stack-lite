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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/project-context.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/agent-skills-bootstrap.md
status: active
revision: 2
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
