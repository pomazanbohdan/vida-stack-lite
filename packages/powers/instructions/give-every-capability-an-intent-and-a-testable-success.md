---
instruction_id: give-every-capability-an-intent-and-a-testable-success
title: Give every capability an intent and a testable success
summary: A capability states what it enables and what would show that it works; an intent that prescribes the implementation is not an intent.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A specification lists capabilities.
conditions_does_not_apply_when: The document carries no capabilities.
artifact_contract_output_type: capability-list
artifact_contract_required_data:
  - the intent of each capability
  - the success criterion of each capability
artifact_contract_verified_by: every capability has both an intent and a success a test or a demonstration can decide
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/assets/spec-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/agent/assets/capability-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/agent/assets/sample-capability.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Give every capability an intent and a testable success
Each capability has both `intent` and `success`. Missing either = not a capability.
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
