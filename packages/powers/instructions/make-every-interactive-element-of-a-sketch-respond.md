---
instruction_id: make-every-interactive-element-of-a-sketch-respond
title: Make every interactive element of a sketch respond
summary: "A static mockup is barely better than a screenshot: every element responds, the backend is faked and the states can be cycled."
capability_tags:
  - design-user-interface
pattern_tags:
  - experiment-design
conditions_applies_when: A sketch or prototype shows interactive elements.
conditions_does_not_apply_when: The artefact is a static image.
artifact_contract_output_type: interactive-sketch
artifact_contract_required_data:
  - the elements that respond
  - the faked backend behaviour
  - the states that can be cycled
artifact_contract_verified_by: every interactive element responds and the states are reachable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/sketch-interactivity.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Make every interactive element of a sketch respond
Static mockups are barely better than screenshots. Every interactive element in a sketch must respond to interaction
If the sketch shows a "Save" button, clicking it should show a brief loading state then a success message. If it shows a search bar, typing should filter hardcoded results. The goal is to feel the full interaction loop, not just see the resting state
If the sketch has multiple states (empty, loading, populated, error), include buttons to cycle through them. Label each state clearly. This lets the user experience how the design handles different data conditions
Add `transition: all 0.15s ease` as a baseline to interactive elements. Subtle motion makes the sketch feel real and helps judge whether the interaction pattern works
