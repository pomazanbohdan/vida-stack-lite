---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-idea-refine-skill-md-96e9bd9e-c02"
title: "addy-skills: skills/idea-refine/SKILL.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:skills/idea-refine/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/idea-refine/SKILL.md\"}"
atom_ids:
  - restate-the-problem-as-how-might-we
  - write-a-not-doing-list
  - write-the-idea-one-pager
atom_count: 3
atoms: "[{\"atom_id\":\"restate-the-problem-as-how-might-we\",\"file_sha256\":\"2d35f7e634de1f8f4cb997b4276b1bd822a01c4a6598dc7bd9c6e8873097f623\",\"content_sha256\":\"48f2ebd44210de36d4c223e356d19394c1af812736b7921900db7d6ba0fcffb4\",\"file_bytes\":2463,\"body_bytes\":973},{\"atom_id\":\"write-a-not-doing-list\",\"file_sha256\":\"fba71d0c3ccc37c6b875ea06c71ee7a0f89ca90d06e4c1052db805180709e45a\",\"content_sha256\":\"f268025f5391ca34cab758ddf8320a8582d6e51f8791a15c9b12b85109fc293e\",\"file_bytes\":2701,\"body_bytes\":1030},{\"atom_id\":\"write-the-idea-one-pager\",\"file_sha256\":\"0f005f286fa2406bfd8cd2832d925554d434178e9261c247b98204d4cb1eb26f\",\"content_sha256\":\"7a37160bc7be35a740db0a831ca53a96251ce0c8bb7f62348f02206bf1294a96\",\"file_bytes\":2224,\"body_bytes\":965}]"
carrier_sha256: 3113e2d8c5a508713d604a1abcc12f43a3aace566281a42c467489ddc622b4b0
carrier_bytes: 7723
revision: 1
status: active
---
<!-- vpmodule:atom:begin restate-the-problem-as-how-might-we -->
---
instruction_id: restate-the-problem-as-how-might-we
title: Restate the problem as a How Might We
summary: "Restate the raw idea as a How Might We problem statement that is narrow enough to act on, broad enough to allow different solutions, and free of an embedded solution."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A raw idea, request or feature concept has to be opened up before options are generated."
conditions_does_not_apply_when: The direction is already chosen and only needs to be written down as a specification.
artifact_contract_output_type: problem-framing
artifact_contract_required_data:
  - the How Might We framing
  - the user it is for
  - the constraint it holds
  - alternative framings of the same problem
artifact_contract_verified_by: the framing names a user and a constraint and contains no embedded solution
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Restate the problem as a How Might We

Restate the idea as a crisp "How Might We" problem statement. This forces clarity on what's actually being solved.

Reframe problems as opportunities using the "How Might We..." format:

- Start with an observation or pain point
- Reframe it as "How might we [desired outcome] for [specific user] without [key constraint]?"
- Generate multiple HMW framings of the same problem — different framings unlock different solutions

**Good HMW qualities:**

- Narrow enough to be actionable ("...help new users find relevant content in their first 5 minutes")
- Broad enough to allow creative solutions (not "...add a recommendation sidebar")
- Contains a tension or constraint that forces creativity

**Bad HMW qualities:**

- Too broad: "How might we make users happy?"
- Too narrow: "How might we add a button to the settings page?"
- Solution-embedded: "How might we build a chatbot for support?"

The restatement changes the frame.
<!-- vpmodule:atom:end restate-the-problem-as-how-might-we -->
<!-- vpmodule:atom:begin write-a-not-doing-list -->
---
instruction_id: write-a-not-doing-list
title: Write a not-doing list
summary: Name what is deliberately not being done and why; the trade-offs are the most valuable part of the plan.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A direction is chosen and its scope has to be stated.
conditions_does_not_apply_when: "Nothing has been chosen yet, so there is nothing to rule out."
artifact_contract_output_type: not-doing-list
artifact_contract_required_data:
  - the things not being done
  - the reason for each
artifact_contract_verified_by: "every entry names a specific thing and a reason, not a general intention"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Write a not-doing list

**The "Not Doing" list is arguably the most valuable part.** Focus is about saying no to good ideas. Make the trade-offs explicit.

The "Not Doing" list does real work. It's specific and reasoned. Each item is something you might *want* to do but shouldn't yet.

Say no to 1,000 things. Focus beats breadth.

**The 'Not Doing' list is mandatory.** Explicitly name what you're cutting and why. This prevents scope creep and forces honest prioritization.

Non-goals are explicit. At least one. Absence means downstream skills fill the vacuum.
What this product is *not* and what it will *not* do in v1. Does outsized work for downstream readers and workflows — prevents the "let me also add this nearby thing" failure mode at every level (epic, ticket, code).
Inline `[NON-GOAL for MVP]` callouts within Features cover deferred items within features; this section captures the broader "we are not building X / we are not becoming Y" statements.
Keep this tight — boundary document, not a feature list.
<!-- vpmodule:atom:end write-a-not-doing-list -->
<!-- vpmodule:atom:begin write-the-idea-one-pager -->
---
instruction_id: write-the-idea-one-pager
title: Write the idea one-pager
summary: "Produce a markdown one-pager that moves the work forward, with the fixed sections, and save it only after the user confirms."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A direction has been chosen and the session has to end with a concrete artefact.
conditions_does_not_apply_when: The direction is still being explored and no choice has been made.
artifact_contract_output_type: idea-one-pager
artifact_contract_required_data:
  - problem statement
  - recommended direction
  - key assumptions to validate
  - MVP scope
  - not doing and why
  - open questions
artifact_contract_verified_by: the one-pager holds every section and the user confirmed saving it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Write the idea one-pager

Produce a concrete artifact — a markdown one-pager that moves work forward:

```markdown
# [Idea Name]

## Problem Statement
[One-sentence "How Might We" framing]

## Recommended Direction
[The chosen direction and why — 2-3 paragraphs max]

## Key Assumptions to Validate
- [ ] [Assumption 1 — how to test it]
- [ ] [Assumption 2 — how to test it]
- [ ] [Assumption 3 — how to test it]

## MVP Scope
[The minimum version that tests the core assumption. What's in, what's out.]

## Not Doing (and Why)
- [Thing 1] — [reason]
- [Thing 2] — [reason]
- [Thing 3] — [reason]

## Open Questions
- [Question that needs answering before building]
```

Ask the user if they'd like to save this to a document (or a location of their choosing). Only save if they confirm.

The output is actionable. The one-pager ends with things you can *do* (validate assumptions, build the MVP, try the experiment), not things to *think about*.
<!-- vpmodule:atom:end write-the-idea-one-pager -->