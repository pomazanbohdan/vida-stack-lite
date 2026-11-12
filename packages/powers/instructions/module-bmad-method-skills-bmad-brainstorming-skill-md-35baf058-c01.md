---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-brainstorming-skill-md-35baf058-c01"
title: "bmad-method: skills/bmad-brainstorming/SKILL.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-brainstorming/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-brainstorming/SKILL.md\"}"
atom_ids:
  - aim-past-the-obvious-and-resist-concluding
  - choose-the-stance-and-hold-it
  - record-who-each-idea-came-from
  - shift-the-creative-domain-every-few-ideas
atom_count: 4
atoms: "[{\"atom_id\":\"aim-past-the-obvious-and-resist-concluding\",\"file_sha256\":\"b283fb0ef478e068882024651886bf6b36c1fa8fd2f3ad484d21f07130e44d7e\",\"content_sha256\":\"cb0205368f370f71892dc281a474715c9ccd3bdc11f9b1fdb994f95de8dba9f3\",\"file_bytes\":1566,\"body_bytes\":265},{\"atom_id\":\"choose-the-stance-and-hold-it\",\"file_sha256\":\"cc1bf82aab1a36501b9906224c01a5d10319d643f3c73d3524dee15fee028b43\",\"content_sha256\":\"019dc10c7948688fbee495b40b8a911e2b14af22b2bfece7946c42eab7e13fdd\",\"file_bytes\":1877,\"body_bytes\":676},{\"atom_id\":\"record-who-each-idea-came-from\",\"file_sha256\":\"31b1d6eddbb888c5a68d9d12114891f7f13fb0203620f94882160ea24bf12fc7\",\"content_sha256\":\"88136e1edc4665442f78797f3a1cfbdf8cf86090cf46a4c0ab43a0487bc85a43\",\"file_bytes\":1612,\"body_bytes\":410},{\"atom_id\":\"shift-the-creative-domain-every-few-ideas\",\"file_sha256\":\"6c99b10627bd5b2128a6a6c8529aa1226fb5d3281a5a97ef809661c714574593\",\"content_sha256\":\"c4e7f7134658ea34087cbd2fcdb44011526c77cf156661cc595c20aad2014a17\",\"file_bytes\":1686,\"body_bytes\":354}]"
carrier_sha256: 8a04a82e24f34153e81ab00223831f3373ee30de193dd08c7fb85c0e5ce597a9
carrier_bytes: 7256
revision: 1
status: active
---
<!-- vpmodule:atom:begin aim-past-the-obvious-and-resist-concluding -->
---
instruction_id: aim-past-the-obvious-and-resist-concluding
title: Aim past the obvious and resist concluding
summary: "The urge to organize or wrap is the enemy of divergence: push for one more, and land only when the user is spent or the topic is mined out."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Ideas are still flowing in an ideation session.
conditions_does_not_apply_when: The session has already been narrowed and a direction is being chosen.
artifact_contract_output_type: generation-ambition
artifact_contract_required_data:
  - the number of ideas the session aimed past
  - the reason the session landed
artifact_contract_verified_by: "the session landed on exhaustion or on a mined-out topic, not on an urge to wrap"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/mode-autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
  - product
---

# Aim past the obvious and resist concluding
**Aim past 100 ideas; resist concluding.** The urge to organize or wrap is the enemy of divergence — when in doubt, push for one more.
Land only when the user is spent or the topic is mined out.
Push past the obvious.
<!-- vpmodule:atom:end aim-past-the-obvious-and-resist-concluding -->
<!-- vpmodule:atom:begin choose-the-stance-and-hold-it -->
---
instruction_id: choose-the-stance-and-hold-it
title: Choose the stance and hold it
summary: "The session runs in one of three stances, chosen by the user at the start or implied by how they asked, and the chosen stance holds for the whole run."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An ideation session opens and the way it will run has not been fixed.
conditions_does_not_apply_when: The stance was already fixed by an earlier agreement.
artifact_contract_output_type: session-stance
artifact_contract_required_data:
  - the stance
  - how it was chosen
artifact_contract_verified_by: the stance is stated and every later move obeys it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/mode-partner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Choose the stance and hold it
The session runs in one of three stances, chosen by the user — set explicitly at the start, or already implied by how they asked: **Facilitator** (you never supply ideas — a forcing function for theirs), **Creative Partner** (you facilitate *and* play along, trading ideas), or **Ideate for me** (you run the whole session yourself and show them the result).
The chosen stance holds for the whole run.
Before you start, tell the user how this mode works and that they stay in control: they can **reject any idea you offer, ask you to help more or less, and tell you how to brainstorm** — a technique to try, a tone, a direction to chase.
<!-- vpmodule:atom:end choose-the-stance-and-hold-it -->
<!-- vpmodule:atom:begin record-who-each-idea-came-from -->
---
instruction_id: record-who-each-idea-came-from
title: Record who each idea came from
summary: "Every idea entry records who it came from, and the log holds every idea, question and piece of direction in the user's own meaning."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: Ideas are written into the record of a session.
conditions_does_not_apply_when: The session produced no ideas.
artifact_contract_output_type: attributed-record
artifact_contract_required_data:
  - the author of each entry
  - "the entry in the user's meaning"
artifact_contract_verified_by: every entry names its author and the wrap-up can hand the user the mirror of what they generated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/mode-partner.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record who each idea came from
Attribution is mandatory here.
Every idea entry records who it came from
This keeps the record honest and lets the wrap-up hand *them* the mirror of what *they* generated.
Log every idea, decision, question, and bit of user direction — anything you'd regret losing if the window closed — one line each, the gist in the user's meaning, in time order; never edit or reorder.
<!-- vpmodule:atom:end record-who-each-idea-came-from -->
<!-- vpmodule:atom:begin shift-the-creative-domain-every-few-ideas -->
---
instruction_id: shift-the-creative-domain-every-few-ideas
title: Shift the creative domain every few ideas
summary: "Every five to ten turns, or every ten ideas, the creative domain shifts, usually by moving to the next technique."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Ideas are being generated in an ideation session.
conditions_does_not_apply_when: The session has moved to narrowing and deciding.
artifact_contract_output_type: domain-shift-log
artifact_contract_required_data:
  - the lens that was active
  - the point at which the domain shifted
artifact_contract_verified_by: the log shows a shift every five to ten turns
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/mode-autonomous.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Shift the creative domain every few ideas
**Keep shifting the creative domain** — every 5–10 turns (or ~10 ideas when you're generating), usually by moving to the next technique.
shift the creative domain every ~10 ideas exactly as the interactive Stance demands — technical, then experiential, then business, then failure modes, then wildcards.
<!-- vpmodule:atom:end shift-the-creative-domain-every-few-ideas -->