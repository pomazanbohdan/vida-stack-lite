---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-spec-md-a3d456b7-c01"
title: "bmad-method: skills/bmad-agent-po/references/spec.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-agent-po/references/spec.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/spec.md\"}"
atom_ids:
  - derive-the-document-from-the-log
  - finish-the-activation-steps-before-the-main-work
  - give-every-capability-an-intent-and-a-testable-success
  - honour-a-forwarded-activation-verbatim
  - keep-a-canonical-run-log
  - keep-the-capability-ids-stable
  - keep-the-kernel-lean-and-the-overflow-in-companions
  - name-the-force-behind-the-work
atom_count: 8
atoms: "[{\"atom_id\":\"derive-the-document-from-the-log\",\"file_sha256\":\"df5c20fc912aa84a4a43bb7e5b10de67728b35475c93475088c931b9e383a116\",\"content_sha256\":\"71fd934bb9998195f81fec3fc3312cd813f2c8412635ca4ed0ec6936b7711d15\",\"file_bytes\":2105,\"body_bytes\":715},{\"atom_id\":\"finish-the-activation-steps-before-the-main-work\",\"file_sha256\":\"a7bd80b75b55b388ea757809e02f4d9b8cc759e1cc119785f0e9e5af3939d48d\",\"content_sha256\":\"0d28c01c8faca5ddf7541c52e36a9e7a83140a204c2f2c6738779af6b9850ac2\",\"file_bytes\":1588,\"body_bytes\":279},{\"atom_id\":\"give-every-capability-an-intent-and-a-testable-success\",\"file_sha256\":\"2e413daa85c0938e3c9295ebb027e93261f8290733d5baf7f8912ba80cd68063\",\"content_sha256\":\"479d259313a534e7dae22037241221d2266860407570478ec3798c1030f37ccd\",\"file_bytes\":3099,\"body_bytes\":1416},{\"atom_id\":\"honour-a-forwarded-activation-verbatim\",\"file_sha256\":\"583afb7326e71b81cd261a58a59d9fc463059bcbc48e651619227f4f985a0ed6\",\"content_sha256\":\"cf53babfa80805968088f2c5a04d468e80ad990024d7ea7d16009ec492a87428\",\"file_bytes\":1554,\"body_bytes\":321},{\"atom_id\":\"keep-a-canonical-run-log\",\"file_sha256\":\"574db4a9a1e7ca03cf7188696de2a7e12b324401597a63ac950ca4aaef7a036c\",\"content_sha256\":\"c863d2cd3afe79b21ed4d8bfa56793707b1e7c34644e461f91db425c398e6a95\",\"file_bytes\":2153,\"body_bytes\":839},{\"atom_id\":\"keep-the-capability-ids-stable\",\"file_sha256\":\"e65cf464ef36ad36962e6d989b72274723ba47117b4ba309222857adac8c9bb2\",\"content_sha256\":\"36851f1c128964e52457cf414dd108abb810e9d0f3e936dbc209d716cf44153d\",\"file_bytes\":2404,\"body_bytes\":1069},{\"atom_id\":\"keep-the-kernel-lean-and-the-overflow-in-companions\",\"file_sha256\":\"cc13c8836e963aa187cf7325bf264748ba0f450fd5d7abd7f0ebc6c031608361\",\"content_sha256\":\"6bb21939b230aaca2f104563f303392b282da066ff1c0f9bfa9528fa1789f9c5\",\"file_bytes\":2830,\"body_bytes\":1580},{\"atom_id\":\"name-the-force-behind-the-work\",\"file_sha256\":\"da94d52bb70102f80bd7561d72fee75f57aba62c2039ffb51b6a11520513161a\",\"content_sha256\":\"00ab841ce83f5f793f402bc327e0990a529d0ec2b7be475ab3cc6e0cc20b3f2b\",\"file_bytes\":1739,\"body_bytes\":611}]"
carrier_sha256: 07edddfe7b737654f69997b8ea3ac6c84b766110596a5c8482043f4fa6537afc
carrier_bytes: 18549
revision: 1
status: active
---
<!-- vpmodule:atom:begin derive-the-document-from-the-log -->
---
instruction_id: derive-the-document-from-the-log
title: Derive the document from the log
summary: "The document is re-derived from the canonical log on every run and never hand-patched, so the steps around it can run in any order."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run has a canonical log and a document that is derived from it.
conditions_does_not_apply_when: There is no log and the document is written directly.
artifact_contract_output_type: derived-document
artifact_contract_required_data:
  - the log the document was derived from
  - the document rendered from it
artifact_contract_verified_by: the document was rendered from the log and no edit was made to it by hand
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body projects decisions from a log into shared documents across PRD, UX, architecture, and epics; it names a cross-domain document workflow but no content domain that can be assigned without inference."
---

# Derive the document from the log
Derived on each run from the
log (the decision-of-record) plus the sources it cites for raw content — never hand-patched.
Deriving the contract from a living log instead of editing the contract in place is what lets the steps around the spec (PRD, UX, architecture, epics) run in any order and feed the same spec without merge drift: the log only accumulates, the artifact is re-rendered.
The spec is updated *only* by re-deriving it here —
a hand-edit
from outside is unsupported and is overwritten on the next derive.
Multiple skills may call to update the same spec over time.
The log (not the rendered document) is the authority on what was decided and on capability IDs.
<!-- vpmodule:atom:end derive-the-document-from-the-log -->
<!-- vpmodule:atom:begin finish-the-activation-steps-before-the-main-work -->
---
instruction_id: finish-the-activation-steps-before-the-main-work
title: Finish the activation steps before the main work
summary: "Run every activation step in the declared order, confirm that each one ran, and only then start the work itself."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The run declares activation steps that come before the main work.
conditions_does_not_apply_when: The work has no activation steps.
artifact_contract_output_type: activation-checklist
artifact_contract_required_data:
  - the activation steps
  - the confirmation that each one ran
artifact_contract_verified_by: the main work started only after every activation step was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Finish the activation steps before the main work
Activation is complete.
Confirm every entry was executed in order before proceeding.
Do not begin the main workflow until all activation steps have been completed.
Execute each entry in
the configured activation steps
in order.
<!-- vpmodule:atom:end finish-the-activation-steps-before-the-main-work -->
<!-- vpmodule:atom:begin give-every-capability-an-intent-and-a-testable-success -->
---
instruction_id: give-every-capability-an-intent-and-a-testable-success
title: Give every capability or requirement an intent and a testable success
summary: A capability or requirement states what it enables and what would show that it works; an intent that prescribes the implementation is not an intent.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A specification lists capabilities or requirements.
conditions_does_not_apply_when: The document carries no capabilities or requirements.
artifact_contract_output_type: capability-list
artifact_contract_required_data:
  - the intent of each capability or requirement
  - the success criterion of each capability or requirement
artifact_contract_verified_by: every capability or requirement has both an intent and a success a test or a demonstration can decide
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/agent/assets/capability-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/agent/assets/sample-capability.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Give every capability or requirement an intent and a testable success
Each capability or requirement has both `intent` and `success`. Missing either = not a capability or requirement.
For a ticket, the requirement line carries its stable `R<n>` and the success signal the ticket's `Done when` checks.
Intents describe WHAT, not HOW. Implementation prescription belongs in a companion (stack, conventions).
Success signal is concrete enough to test or demonstrate against. "Users love it" doesn't qualify.
One sentence. "User or system can do X to achieve Y." WHAT, not HOW.
Testable or demonstrable criterion. Something a test or a real demonstration can decide.
One or two sentences. World-change moment, not dashboard. Concrete enough to write a test or run a demonstration against.
The outcome is the artifact or change that exists when this is done.
Who or what acts on it does so without this conversation in the room, so it must be the bar: what has to be true of it for them to act.
What you cannot infer: an owner or domain specific the persona does not already carry; wiring: a path, a format, a tool, a config value read on activation; a rule with a real consequence behind it, and the consequence.
What the user sees when it is done: where the output is, the one decision left to them, what to try next.
Never a script of steps: your persona is already in the room and supplies the voice and the route.
<!-- vpmodule:atom:end give-every-capability-an-intent-and-a-testable-success -->
<!-- vpmodule:atom:begin honour-a-forwarded-activation-verbatim -->
---
instruction_id: honour-a-forwarded-activation-verbatim
title: Honour a forwarded activation verbatim
summary: "When a caller supplies the intent and the pre-resolved fields, use them as given and resolve only what was not supplied."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A caller invoked the work with a stated intent and pre-resolved fields.
conditions_does_not_apply_when: No caller supplied anything and everything has to be inferred.
artifact_contract_output_type: activation
artifact_contract_required_data:
  - the supplied intent and fields
  - the fields that still had to be resolved
artifact_contract_verified_by: every supplied field was used as given and only the missing ones were resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Honour a forwarded activation verbatim
**Forwarded activation:** if a caller invoked you with a stated intent and pre-resolved customization fields
honor them verbatim — skip your own intent inference, use the supplied values for those named fields, and resolve only the remaining fields from your own
configuration.
<!-- vpmodule:atom:end honour-a-forwarded-activation-verbatim -->
<!-- vpmodule:atom:begin keep-a-canonical-run-log -->
---
instruction_id: keep-a-canonical-run-log
title: Keep a canonical run log
summary: "Every decision, change and override lands as one append-only line in the canonical log of the run, and the document is distilled toward it."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is under way and decisions are being made.
conditions_does_not_apply_when: The work is a single step with nothing worth remembering.
artifact_contract_output_type: run-log
artifact_contract_required_data:
  - the entries in the order they happened
  - the kind of each entry
  - the gist and the reason of each entry
artifact_contract_verified_by: a later run can resume from the log alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a canonical run log
The log is
the run's canonical memory and audit trail — every decision, change, and override (including headless overrides) lands as one append-only line as the conversation unfolds.
The document is distilled toward it; whatever isn't logged is lost on resume.
The log is
canonical — an append-only, chronological record of every decision, constraint, capability (with its stable `CAP-N`), assumption, open question, and bit of user direction, one line each in the order it happened, never edited or reordered.
Log each decision, capability, constraint, and accepted change to
the log
as it is made — that running record is what the render reads.
Because the log is append-only, a later entry supersedes an earlier one on the same point while the history stays intact.
Read it back only to resume or audit
<!-- vpmodule:atom:end keep-a-canonical-run-log -->
<!-- vpmodule:atom:begin keep-the-capability-ids-stable -->
---
instruction_id: keep-the-capability-ids-stable
title: Keep the capability ids stable
summary: Capability ids are never reused and never renumbered; a new capability takes the next unused id and the same slug updates in place.
capability_tags:
  - plan-implementation
pattern_tags:
  - living-specification
conditions_applies_when: A specification with numbered capabilities is updated.
conditions_does_not_apply_when: The specification has no numbered capabilities.
artifact_contract_output_type: identifier-scheme
artifact_contract_required_data:
  - the preserved ids
  - the new id
  - the retired ids
artifact_contract_verified_by: the ids of the earlier version are unchanged and no retired id was reused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/insert-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the capability ids stable
Capability IDs are stable and unique. Never reused, never renumbered.
new capabilities get the next unused `CAP-N`; never reuse retired IDs.
The same rule applies to a ticket's requirement ids: never reuse or renumber `R<n>`; a new requirement takes the next unused id.
A second invocation with the same
slug
lands at the existing spec folder and updates in place, preserving capability IDs.
Same slug = same folder.

When work has to be inserted into the middle of a planned sequence, give it a sub-number so the existing numbering stays intact. Never renumber the existing units and never modify the unit you inserted after.
**Keep the `id`.** Consent is stored per `(realpath(projectRoot), capability id)`. Changing the `id` re-prompts consent in every project that has the capability installed, and orphans the old update path.
With no transfer or rename tooling, `id` continuity is manual, and an `id` change is a hard break for every installed consumer — a consent re-prompt, a broken update path, and an orphaned ledger entry.
<!-- vpmodule:atom:end keep-the-capability-ids-stable -->
<!-- vpmodule:atom:begin keep-the-kernel-lean-and-the-overflow-in-companions -->
---
instruction_id: keep-the-kernel-lean-and-the-overflow-in-companions
title: Keep the kernel lean and the overflow in companions
summary: "A claim is load-bearing when a consumer would change a decision without it; what does not fit the kernel moves into a named companion, and diagrams always do."
capability_tags:
  - plan-implementation
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Content is being placed into a document that has a kernel and companions.
conditions_does_not_apply_when: The content fits the kernel field it belongs to.
artifact_contract_output_type: content-placement
artifact_contract_required_data:
  - the load-bearing claims
  - the companion each overflow went to
  - the owner of each companion
artifact_contract_verified_by: "the kernel holds one line per claim, every companion is named for its content and every diagram is in a companion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - design-ux
---

# Keep the kernel lean and the overflow in companions
A claim is **load-bearing** if any consumer (downstream skill, implementing agent, verification pass) would change a decision without it.
When load-bearing content does not fit the five-field kernel, it lives in a companion. The kernel cites it; the companion holds it.
Spawn a companion when the content needs more than one kernel-shape line: multi-item catalogs (per-entity matrices like archetypes, drinks, modes, routes), tables, diagrams (always), editorial voice rules, long-form reference material the kernel cites by name (glossary, brownfield notes, project conventions).
Single-line decision-benders stay in Constraints; intent+success pairs stay in Capabilities.
If a kernel field is starting to bullet into sub-bullets, the content has outgrown the kernel and wants a companion.
Name spec-authored companions for the content type they hold.
The principle: "a reader should know what is inside before opening it."
Adopted companions are load-bearing artifacts written by an upstream skill that downstream still needs to read.
The originating skill owns them.
Diagrams always land in a companion, regardless of size.
Mermaid blocks, ASCII diagrams, and image references all live in a companion
Pre-existing project-wide docs
that downstream needs are listed as **adopted companions**, never duplicated into
a spec-authored companion.
Companions follow the same lean discipline as
the kernel.
Write lean from the first pass: every sentence must earn its place. Decoration costs tokens and dilutes downstream readers.
<!-- vpmodule:atom:end keep-the-kernel-lean-and-the-overflow-in-companions -->
<!-- vpmodule:atom:begin name-the-force-behind-the-work -->
---
instruction_id: name-the-force-behind-the-work
title: Name the force behind the work
summary: "The opening paragraph names which force drives the work — a pain to solve, an opportunity to capture, a vision to realize or a mandate to meet — and who it affects."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: A specification is written and its reason has to be stated.
conditions_does_not_apply_when: The reason for the work is already fixed by an agreement.
artifact_contract_output_type: why-section
artifact_contract_required_data:
  - the force or the forces
  - who is affected
  - the backdrop
artifact_contract_verified_by: the reason reads as the anchor the downstream trade-offs resolve against
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
---

# Name the force behind the work
One paragraph naming the force behind this work.
A spec can exist for any of:
- **a pain to solve** — a user or operator is stuck on a specific gap;
- **an opportunity to capture** — something newly possible we want to claim;
- **a vision to realize** — a thing we want to make exist because we want it to exist;
- **a mandate to meet** — a regulation, deprecation, deadline, or contractual obligation.
Name which (or which combination) applies, who is affected, and the backdrop that makes it matter now.
This is the anchor every downstream trade-off resolves against.
<!-- vpmodule:atom:end name-the-force-behind-the-work -->