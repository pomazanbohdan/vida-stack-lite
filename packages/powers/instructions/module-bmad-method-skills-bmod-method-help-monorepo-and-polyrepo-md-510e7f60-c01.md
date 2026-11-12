---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-monorepo-and-polyrepo-md-510e7f60-c01"
title: "bmad-method: skills/bmod-method/help/monorepo-and-polyrepo.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/monorepo-and-polyrepo.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/monorepo-and-polyrepo.md\"}"
atom_ids:
  - give-each-project-its-own-checkout-and-its-own-rules
  - keep-the-planning-at-the-root-that-holds-every-project
atom_count: 2
atoms: "[{\"atom_id\":\"give-each-project-its-own-checkout-and-its-own-rules\",\"file_sha256\":\"541b7d1690f923cabf5df180e8ef1badc075cc22afa14874fb88a35e5f9470d8\",\"content_sha256\":\"979defea2630f5f0db292e1c30881d60288906bdf1ef9d03b3c1c6472fc61094\",\"file_bytes\":1760,\"body_bytes\":479},{\"atom_id\":\"keep-the-planning-at-the-root-that-holds-every-project\",\"file_sha256\":\"cee716f5d5e2220a2f969abf3181654577351f8c4580ca99d76cd7698d179de3\",\"content_sha256\":\"728697fbbb1cdef2ed40c69e36f4c236f87c0a4e3e2bdd6fcc6a04c01ccafa68\",\"file_bytes\":1564,\"body_bytes\":307}]"
carrier_sha256: 090c4d8ae3416885f2ac5cc05cf579e9ad1607b2b622a8733bf3d47bbcecfba6
carrier_bytes: 3651
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-each-project-its-own-checkout-and-its-own-rules -->
---
instruction_id: give-each-project-its-own-checkout-and-its-own-rules
title: Give each project its own checkout and its own rules
summary: "Give each project a bare clone with a worktree per branch, so several branches are open at once and agents working in parallel do not collide in one checkout; the rules belong to the project that owns them, and only what holds everywhere goes to the root."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: Several agents or several branches work in the same project at once.
conditions_does_not_apply_when: One agent works in one checkout.
artifact_contract_output_type: workspace-layout
artifact_contract_required_data:
  - the bare clone
  - the worktree per branch
  - the rules file that owns the rules
artifact_contract_verified_by: two branches are open at once and the rules a project owns stay in that project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/monorepo-and-polyrepo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Give each project its own checkout and its own rules
For each project, recommend a bare repository with worktrees: one bare clone per project, and a worktree per branch beside it.
Several branches of one project can then be open at once, and agents working in parallel do not collide in one checkout.
rules belong to each project's own `AGENTS.md`, because each repository has its own conventions.
Rules that hold across all of them go in an `AGENTS.md` at the workspace root.
<!-- vpmodule:atom:end give-each-project-its-own-checkout-and-its-own-rules -->
<!-- vpmodule:atom:begin keep-the-planning-at-the-root-that-holds-every-project -->
---
instruction_id: keep-the-planning-at-the-root-that-holds-every-project
title: Keep the planning at the root that holds every project
summary: "When the work spans several repositories, the planning lives at the root that holds them all, outside the individual repositories, because a brief, a plan or a spec usually spans several of them; each piece of work names the projects it touches."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work spans more than one repository.
conditions_does_not_apply_when: The work stays inside one repository.
artifact_contract_output_type: workspace-layout
artifact_contract_required_data:
  - the root that holds the projects
  - where the planning lives
  - the projects a piece of work touches
artifact_contract_verified_by: one session at that root reaches the plan and every project it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/monorepo-and-polyrepo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the planning at the root that holds every project
The output folder also sits at the workspace root, outside the individual repositories.
All planning goes there, because a brief, a PRD, an architecture, or a spec usually spans several of the projects.
A spec or story names the projects it touches.
<!-- vpmodule:atom:end keep-the-planning-at-the-root-that-holds-every-project -->