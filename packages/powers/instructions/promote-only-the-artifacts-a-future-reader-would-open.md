---
instruction_id: promote-only-the-artifacts-a-future-reader-would-open
title: Promote only the artifacts a future reader would open
summary: "Walk the working folder with the person and promote only the artifacts with lasting reference value; the bar is whether a future reader of the design documents would open it, and the default is to leave it where it is."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The run produced visual artifacts that could be kept.
conditions_does_not_apply_when: There are no visual artifacts to promote.
artifact_contract_output_type: promotion-set
artifact_contract_required_data:
  - the promoted artifacts
  - the artifacts left behind
artifact_contract_verified_by: every promoted artifact passes the bar and every unpromoted one is left in the working folder
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/creative-tools.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
status: active
revision: 1
---

# Promote only the artifacts a future reader would open
At Finalize, the facilitator walks `.working/` with the user and promotes artifacts with lasting reference value
Bar for promotion: *would a future reader of `DESIGN.md` or `EXPERIENCE.md` open this?* Default is leave-in-`.working/`.
`.working/` is the audit trail and survives the run.
Lifts visual decisions into DESIGN.md and behavioral decisions into EXPERIENCE.md.
Promote `.working/` keepers to `mockups/` (HTML) or `wireframes/` (Excalidraw); imports stay.
Inline relative links at relevant spine sections; state spines-win-on-conflict once.
