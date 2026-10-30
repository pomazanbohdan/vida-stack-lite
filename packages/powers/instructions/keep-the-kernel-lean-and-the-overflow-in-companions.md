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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
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
