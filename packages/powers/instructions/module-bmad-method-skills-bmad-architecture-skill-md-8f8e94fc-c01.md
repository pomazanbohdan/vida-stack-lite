---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-architecture-skill-md-8f8e94fc-c01"
title: "bmad-method: skills/bmad-architecture/SKILL.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-architecture/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-architecture/SKILL.md\"}"
atom_ids:
  - give-every-decision-an-id-a-binding-and-a-prevented-divergence
  - inherit-the-parent-invariants-as-binding
  - keep-the-architecture-document-a-build-substrate
  - separate-the-invariants-from-the-cold-start-scaffold
  - show-the-alternatives-for-the-load-bearing-calls
  - sweep-every-dimension-or-name-it-deferred
  - verify-a-named-technology-before-you-pin-it
atom_count: 7
atoms: "[{\"atom_id\":\"give-every-decision-an-id-a-binding-and-a-prevented-divergence\",\"file_sha256\":\"5f59a635afca35e45591e53ef9c80b57eeae1548a5c8eca0507106607c9ae8fe\",\"content_sha256\":\"c207fffaac9d0561bea4a787c3d6d71c6cd481ab28022052d728abcc7780e2b7\",\"file_bytes\":1927,\"body_bytes\":611},{\"atom_id\":\"inherit-the-parent-invariants-as-binding\",\"file_sha256\":\"db921fe7401477206d08909952dc8379a56e1aafc89bd3c9c14fed4a0f3c8e97\",\"content_sha256\":\"66b145b063786b3ccb9728fdbd7d91685f0a6a171c9beefa66046ee3f3b25cc6\",\"file_bytes\":1859,\"body_bytes\":679},{\"atom_id\":\"keep-the-architecture-document-a-build-substrate\",\"file_sha256\":\"6ea56289b3ccf814a6db6cfb5568f2c2b4e767155db7df5a666aeaff9ca23e87\",\"content_sha256\":\"901241290f1bad647b18ff7fe897072d80142cac24a10f4adf7803a725734ac7\",\"file_bytes\":2195,\"body_bytes\":821},{\"atom_id\":\"separate-the-invariants-from-the-cold-start-scaffold\",\"file_sha256\":\"96727eab8186d723e299e9126a2e87ba3bb57aa6f4a0f0899b67154397f0ded1\",\"content_sha256\":\"6b3b48dfdb041e8aaf2a56d6ed660c6579444a4e8e14dd25ecf9d0c524409e2c\",\"file_bytes\":2023,\"body_bytes\":635},{\"atom_id\":\"show-the-alternatives-for-the-load-bearing-calls\",\"file_sha256\":\"a464fc37c8a864e4b5a2de3f8ad65f278d662782130ccb13792ffae4082f5549\",\"content_sha256\":\"aff9e6c9e312d6b6aa5990e6a74140d8274653b424ac9ce30641d3c12d2030f0\",\"file_bytes\":1464,\"body_bytes\":345},{\"atom_id\":\"sweep-every-dimension-or-name-it-deferred\",\"file_sha256\":\"f9fc3fdeb372a0e6f52c4038f73ba16e775c04ed2eaeefaa5babc6975137fe2c\",\"content_sha256\":\"c662830e41cd93fdcc85c6e795ba247daf2ba16fb1dadf4978164f1567c24980\",\"file_bytes\":2535,\"body_bytes\":1116},{\"atom_id\":\"verify-a-named-technology-before-you-pin-it\",\"file_sha256\":\"aa2bec61825e5d90bf475087dea45471b12e7e048cfd29e8756fbc5ce1915a23\",\"content_sha256\":\"806f7af87641c0b0a007bfc67da4588d4e4ec52b30ec7d6566f1825b8fac072a\",\"file_bytes\":1619,\"body_bytes\":286}]"
carrier_sha256: 981364a0e1a81338c22ec0fb800e09f2a6f3807518f61ad767a409ce21798d7d
carrier_bytes: 14695
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-every-decision-an-id-a-binding-and-a-prevented-divergence -->
---
instruction_id: give-every-decision-an-id-a-binding-and-a-prevented-divergence
title: "Give every decision an id, a binding and a prevented divergence"
summary: "Each decision that survives carries a stable id, states what it binds, the divergence it prevents and the rule a downstream unit must follow."
capability_tags:
  - design-structure
pattern_tags:
  - decision-trail
conditions_applies_when: Decisions are being collected into a contract that later work has to cite.
conditions_does_not_apply_when: The decisions stay in the conversation and are never written down.
artifact_contract_output_type: decision-entries
artifact_contract_required_data:
  - the stable id
  - the binding
  - the prevented divergence
  - the rule
artifact_contract_verified_by: every surviving decision carries all four parts and its id is stable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Give every decision an id, a binding and a prevented divergence
Each surviving decision becomes an `AD-n`
(stable ID, `Binds`/`Prevents`/`Rule`, `[ADOPTED]` when the user or existing reality already settled it)
a decision that lives only in a diagram still gets logged
for a decision, capture what it binds and the divergence it prevents
When a ticket drove the run, `Binds` cites the ticket's `R` ids or unit ids; at epic altitude it also cites the inherited parent `AD` ids.
Include a dependency-direction diagram (who may depend on whom) — it IS a rule; author it as valid mermaid, never an empty graph.
<!-- vpmodule:atom:end give-every-decision-an-id-a-binding-and-a-prevented-divergence -->
<!-- vpmodule:atom:begin inherit-the-parent-invariants-as-binding -->
---
instruction_id: inherit-the-parent-invariants-as-binding
title: Inherit the parent invariants as binding
summary: "Load the parent contract first, treat its decisions as read-only constraints, and decide only what the parent left open."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A contract is being written below one that already exists.
conditions_does_not_apply_when: "There is no parent contract, or the parent is being replaced rather than extended."
artifact_contract_output_type: inherited-invariants
artifact_contract_required_data:
  - the inherited decisions
  - the constraint entries
  - the open items
  - the conflicts
artifact_contract_verified_by: the inherited decisions are listed unrenumbered and every new decision either avoids or surfaces a conflict with them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Inherit the parent invariants as binding
Read the epic ticket in full first.
load the parent spine first and treat its `AD`s, conventions, and paradigm as **binding, read-only** constraints
log each as a `constraint` entry, list them under the spine's *Inherited Invariants* (parent `AD` IDs, never renumbered), and don't re-derive them.
Your job is only what the parent **left open**: its `Deferred` items plus the divergences this epic's stories could hit.
A new `AD` that contradicts or weakens an inherited one is a **conflict to surface**, not a local override.
An epic spine fixes the invariants the epic's stories must share — it does **not** expand per-story detail.
<!-- vpmodule:atom:end inherit-the-parent-invariants-as-binding -->
<!-- vpmodule:atom:begin keep-the-architecture-document-a-build-substrate -->
---
instruction_id: keep-the-architecture-document-a-build-substrate
title: Keep the architecture document a build substrate
summary: "Keep the document terse and convergent: decisions, not rationale, shape in diagrams rather than prose, and no template comment left in the finished text."
capability_tags:
  - design-structure
pattern_tags:
  - technical-writing
conditions_applies_when: A consistency contract is being finalised for people and small agents to build from.
conditions_does_not_apply_when: The artefact is a discussion document whose purpose is to keep the open questions in front.
artifact_contract_output_type: architecture-document
artifact_contract_required_data:
  - the invariants
  - the diagrams
  - the deferred items
  - the stripped template comments
artifact_contract_verified_by: "the finished document carries no template comment, no rationale and no placeholder"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the architecture document a build substrate
Default output is a **build substrate** — terse and convergent, so small agents and humans on small intents don't drift.
A ticket file (the initiative's or epic's `<type>-<slug>.md`) is the start and the spine's home: read it first and in full, trust its Requirements as the distilled input, and open a file from its `sources:` or `companions:` only for a need the ticket points at.
The finished spine is adopted as a companion of that ticket.
Record decisions, not rationale (rationale lives in the memlog).
Carry shape in diagrams, not prose.
The template's `<!-- -->` notes are guidance — act on them, then strip them; the finished spine carries no template comment, and only the diagrams that convey the structure (as many as the altitude needs, valid mermaid).
<!-- vpmodule:atom:end keep-the-architecture-document-a-build-substrate -->
<!-- vpmodule:atom:begin separate-the-invariants-from-the-cold-start-scaffold -->
---
instruction_id: separate-the-invariants-from-the-cold-start-scaffold
title: Separate the invariants from the cold-start scaffold
summary: "The contract holds only the invariants that keep separately built units aligned; everything structural is a seed the code owns, and the rest is deferred with its reason."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A consistency contract is being written for parts of a system that are built separately.
conditions_does_not_apply_when: The contract is a general design document rather than a cross-unit consistency contract.
artifact_contract_output_type: consistency-contract
artifact_contract_required_data:
  - the invariants
  - the paradigm
  - the seed
  - the deferred decisions
artifact_contract_verified_by: the invariants and the seed are in separate places and the deferred decisions carry a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Separate the invariants from the cold-start scaffold
You produce a consistency contract that fixes only the **invariants** keeping independently-built units from diverging — the design paradigm, the boundary and dependency rules, how state is mutated, who owns shared data — the durable calls a future builder *can't* read off compliant code.
Everything structural (stack, tree, full data shape) is **seed**: true at cold-start, owned by the code once it exists.
Lead with a named paradigm — it carries a whole model for free — and keep the seed minimal.
Decisions intentionally pushed down, each with the reason it can wait
<!-- vpmodule:atom:end separate-the-invariants-from-the-cold-start-scaffold -->
<!-- vpmodule:atom:begin show-the-alternatives-for-the-load-bearing-calls -->
---
instruction_id: show-the-alternatives-for-the-load-bearing-calls
title: Show the alternatives for the load-bearing calls
summary: "Lay out the realistic alternatives you weighed and which way you lean, then let the owner choose; the reasoning stays in the conversation."
capability_tags:
  - design-structure
pattern_tags:
  - decision-trail
conditions_applies_when: A decision that everything else depends on is about to be made.
conditions_does_not_apply_when: The decision was already made by the owner or by the existing code.
artifact_contract_output_type: alternatives-and-lean
artifact_contract_required_data:
  - the alternatives
  - the lean
  - the choice made by the owner
artifact_contract_verified_by: the owner chose among the alternatives that were laid out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Show the alternatives for the load-bearing calls
The load-bearing calls — paradigm, stack or starter, the major boundaries — are *shown, not silently made*: lay out the realistic alternatives you weighed and why you lean one way, then let the user choose.
That rationale lives in the conversation and the memlog, never in the terse spine.
<!-- vpmodule:atom:end show-the-alternatives-for-the-load-bearing-calls -->
<!-- vpmodule:atom:begin sweep-every-dimension-or-name-it-deferred -->
---
instruction_id: sweep-every-dimension-or-name-it-deferred
title: Sweep every dimension or name it deferred
summary: "Every dimension the level owns is decided, deferred or an open question; a dimension left silent is the failure."
capability_tags:
  - design-structure
pattern_tags:
  - dimension-sweep
conditions_applies_when: A contract is being written at a level that owns a known set of dimensions.
conditions_does_not_apply_when: The artefact is a note rather than a contract with dimensions to cover.
artifact_contract_output_type: dimension-sweep
artifact_contract_required_data:
  - the dimensions
  - the decisions
  - the deferred ones
  - the open questions
artifact_contract_verified_by: no dimension of the level is silent and no placeholder stands in for one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/references/reviewer-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/opencode-v2-verification-matrix.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Sweep every dimension or name it deferred
Sweep the breadth the altitude owns — every structural dimension is decided, deferred, or an open question
a whole dimension left silent (e.g. the operational/environmental envelope: deployment & environments, infra/provider strategy, operations) is the failure, not a clean spine.
every dimension the altitude owns is decided, deferred, or an open question — a whole dimension left silent is a finding, especially the operational/environmental envelope (deployment & environments, infra/provider strategy, operations) a domain-focused draft skips.
No placeholders; never invent to fill a gap.
- **Implemented** (rows B9, B10, C2) | Needed only tool, session and shell events the plugin already receives.
- **Not applicable** | It blocks a GSD executor dispatch that omits harness-managed worktree isolation. OpenCode's descriptor declares `dispatch.isolation: orchestrator-worktree`, so GSD manages the worktree and the guard would never act.
- **Waived** | 2.x keeps the `lsp` setting but runs no language servers and exposes no LSP tools; there is nothing to wire.
<!-- vpmodule:atom:end sweep-every-dimension-or-name-it-deferred -->
<!-- vpmodule:atom:begin verify-a-named-technology-before-you-pin-it -->
---
instruction_id: verify-a-named-technology-before-you-pin-it
title: Verify a named technology before you pin it
summary: Check the current version and fit of every technology you name against the live source before it enters the contract.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: "A technology, a starter or a version is about to be named in a contract or a recommendation."
conditions_does_not_apply_when: The technology is already fixed by an existing project and only has to be recorded.
artifact_contract_output_type: verified-technology
artifact_contract_required_data:
  - the technology
  - the current version
  - the fit
  - the source checked
artifact_contract_verified_by: the pinned version was checked against a live source before it was written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-architecture/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Verify a named technology before you pin it
Verify any named technology's current version and fit on the web before binding it.
recommend a well-known current starter (verify the going choice on the web first)
You still verify named tech on the web (you can't ask, but you can check)
<!-- vpmodule:atom:end verify-a-named-technology-before-you-pin-it -->