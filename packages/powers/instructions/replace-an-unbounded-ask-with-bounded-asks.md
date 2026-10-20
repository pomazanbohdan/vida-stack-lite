---
instruction_id: replace-an-unbounded-ask-with-bounded-asks
title: Replace an unbounded ask with bounded asks
summary: "An ask that no set of questions can answer is turned into a short list of bounded asks, and no run starts until they exist."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The ask is too wide to answer as it stands.
conditions_does_not_apply_when: The ask is already bounded by a question set.
artifact_contract_output_type: bounded-ask-list
artifact_contract_required_data:
  - the bounded asks
  - where a question stopped
  - the next ask to draft
artifact_contract_verified_by: no run started against an unbounded ask and every stopped question names its next ask
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 1
---

# Replace an unbounded ask with bounded asks
- An ask with no such set ("document the whole project") gets a short list of bounded asks instead and no run; headless, end `blocked` with them in `open_questions`.
- When a question’s budget runs out, or an answer opens a question the set does not hold, that question stops: write what its digests hold, and put where it stopped and the next ask, drafted by the rules above, in `## Open questions`.
