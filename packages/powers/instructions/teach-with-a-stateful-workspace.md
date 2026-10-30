---
instruction_id: teach-with-a-stateful-workspace
title: Teach with a stateful workspace
summary: "Teach a topic over multiple sessions in a stateful workspace, grounding knowledge, skills and wisdom, and sizing each lesson to the learner's zone of proximal development."
capability_tags:
  - teach-with-workspace
pattern_tags:
  - teaching-workspace
conditions_applies_when: "The user wants to learn a concept over time, not get a one-off answer."
conditions_does_not_apply_when: A single explanation settles the question.
artifact_contract_output_type: teaching-workspace
artifact_contract_required_data:
  - mission
  - lessons
  - resources
  - learning records
artifact_contract_verified_by: "every lesson traces back to the mission and fits the learner's current level"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/MISSION-FORMAT.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - research
  - operations
---

# Teach with a stateful workspace
The user has asked you to teach them something. This is a stateful request - they intend to learn the topic over multiple sessions.
Treat the current directory as a teaching workspace. The state of their learning is captured in this directory in several files:
- A mission document: captures the _reason_ the user is interested in the topic. This should be used to ground all teaching.
- A `reference/` directory of reference materials: the compressed learnings from the lessons - cheat sheets, reference algorithms, syntax, glossaries. They are the raw units of learning. They should be beautiful documents which print out well, and are designed for quick reference.
- A resources list: resources which can be explored to ground your teaching in contextual knowledge, or to acquire knowledge and wisdom.
- A `learning-records/` directory: captures what the user has learned. These are loosely equivalent to architectural decision records in software development - they capture non-obvious lessons and key insights that may need to be revised later, or drive future sessions. These should be used to calculate the zone of proximal development.
- A `lessons/` directory: a **lesson** is a single, self-contained HTML output that teaches one tightly-scoped thing tied to the mission. This is the primary unit of teaching in this workspace.
- An `assets/` directory: reusable **components** shared across lessons.
- A scratchpad: user preferences, or working notes.
## Philosophy
To learn at a deep level, the user needs three things:
- **Knowledge**, captured from high-quality, high-trust resources
- **Skills**, acquired through highly-relevant interactive lessons devised by you, based on the knowledge
- **Wisdom**, which comes from interacting with other learners and practitioners
Before the resources list is well-populated, your focus should be to find high-quality resources which will help the user acquire knowledge. Never trust your parametric knowledge.
## The Mission
Every lesson should be tied into the mission - the reason that the user is interested in learning about the topic.
If the user is unclear about the mission, or the mission document is not populated, your first job should be to question the user on why they want to learn this.
Failing to understand the mission will mean knowledge acquisition is not grounded in real-world goals. Lessons will feel too abstract. You will have no way of judging what the user should do next.
Missions may change as the user develops more skills and knowledge. This is normal - make sure to update the mission document and add a learning record to capture the change. Confirm with the user before changing the mission.
## Zone Of Proximal Development
Each lesson, the user should always feel as if they are being challenged 'just enough'.
The user may specify an exact thing they want to learn. If they don't, figure out their zone of proximal development by:
- Reading their learning records
- Figuring out the right thing to teach them based on their mission
- Teach the most relevant thing that fits in their zone of proximal development
## Mission rules
- **One mission per workspace.** If the user wants to learn two unrelated things, that is two workspaces.
- **Concrete over abstract.** "Run a half marathon by October" beats "get fitter." "Ship a Rust CLI to my team" beats "learn Rust."
- **Push back on vagueness.** If the user cannot articulate why, interview them before writing anything. A bad mission is worse than no mission.
- **Revise when reality shifts.** Missions change. When the user's goal moves, update this file: don't leave a stale mission steering future sessions.
- **Keep it short.** If the mission document runs past a screen, it has stopped being a compass and started being a plan.
