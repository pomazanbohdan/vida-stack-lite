---
instruction_id: explain-a-subsystem
title: Explain a subsystem from purpose to detail
summary: "Build a senior engineer's working mental model of a subsystem: purpose, boundary, main flow, and the places that surprise, not a retelling of the source."
capability_tags:
  - explain-subsystem
pattern_tags:
  - subsystem-explanation
conditions_applies_when: Someone who does not know a part of the system needs to understand how it works.
conditions_does_not_apply_when: A single line or a defect fix needs a narrow description.
artifact_contract_output_type: subsystem-explanation
artifact_contract_required_data:
  - purpose
  - boundary
  - main flow
  - data structures
  - example
artifact_contract_verified_by: a newcomer locating the right place after reading the explanation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/references/explainer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/bro/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/teach/SKILL.md
status: active
revision: 1
---

# Explain a subsystem from purpose to detail
Produce an architectural explanation at the level of a senior engineer onboarding onto a subsystem: enough to build a working mental model, not so much that it reads like annotated source code.
If the scope is ambiguous, state your interpretation and explore. The user can redirect.
For a simple question, a single module or a narrow function, explore and explain in one pass.
For a complex question, a subsystem spanning multiple files or services, decompose it into two to four angles, each a distinct slice, and explore them in parallel.
Reconcile the findings: merge overlapping descriptions, resolve contradictions by checking the code yourself, and combine the separate slices into a unified picture.
Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently.
Use this structure, dropping any section that does not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
Overview: one or two paragraphs on what this thing is, what it does, and why it exists, so someone can decide whether to keep reading.
Key Concepts: the important types, services, or abstractions needed to follow the rest, briefly defined.
How It Works: walk through the flow, what triggers it, what happens step by step, where data goes, and what the decision points are.
Use prose, not pseudocode. Reference specific files and functions, but do not dump large code blocks unless a snippet is essential.
Include a diagram only when components talk to each other or data transforms through stages, and only when prose does not already cover the flow.
Where Things Live: a brief file or directory map of the places someone would need to start working.
Gotchas: non-obvious things, surprising behavior, historical context, and pitfalls. Skip the section when there is nothing worth calling out.
Use concrete language: say that the user service calls the auth client to refresh, not that the service delegates to the client.
When something is complex, explain why it is complex. When it is simple, do not pad it out.
If there is a helpful analogy, use it. If there is not, do not force one.
Start with a plain definition, then tie it to the case in front of the reader.
Show the smallest complete answer first, then add layers when the reader asks.
Build the picture up one part at a time: draw a short series rather than one diagram with every moving part.
Acknowledge open questions and gaps rather than hiding them.
Reword freely for teaching, but keep confidence language intact: hedges are findings, not style.
