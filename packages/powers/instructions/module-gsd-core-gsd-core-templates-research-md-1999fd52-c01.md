---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-research-md-1999fd52-c01"
title: "gsd-core: gsd-core/templates/research.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/templates/research.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/research.md\"}"
atom_ids:
  - assign-each-capability-to-a-tier-before-the-research
  - copy-the-locked-decisions-verbatim-into-the-research
  - draw-the-flow-not-the-file-list
  - list-the-problems-you-must-not-solve-yourself
  - put-an-expiry-on-research
atom_count: 5
atoms: "[{\"atom_id\":\"assign-each-capability-to-a-tier-before-the-research\",\"file_sha256\":\"0632c95210e02b6e65c47d758f2edbe134cfc8e77ff6a9d73c3503ae7f786d7d\",\"content_sha256\":\"88b64822de82a3b3468fd2cc36b29613c082f9d361cef6e361e673d383a8fb4c\",\"file_bytes\":1293,\"body_bytes\":223},{\"atom_id\":\"copy-the-locked-decisions-verbatim-into-the-research\",\"file_sha256\":\"2aa190eaf3068d3bded48732087fb62caa58eda616ecccec6aea99a33d3e0740\",\"content_sha256\":\"4d173bc2e394add3b3df13013ed410661a12ad5e76153dfa17df9a0aaeda5700\",\"file_bytes\":1280,\"body_bytes\":185},{\"atom_id\":\"draw-the-flow-not-the-file-list\",\"file_sha256\":\"f38ed79b9b3b149b1250e3c8a35035c714a4d80d66a7960c0091205838fba8b9\",\"content_sha256\":\"0d7942cbee65f494e67a5fd6ec1631a98e538c463c275e14ce295c6527d2141c\",\"file_bytes\":1359,\"body_bytes\":326},{\"atom_id\":\"list-the-problems-you-must-not-solve-yourself\",\"file_sha256\":\"44b205c2827e333293d45a1fca2eb8c8231939a3ed1e7e4c305b9941d5ab4f68\",\"content_sha256\":\"069ea4991fc8683c07bdf66cbc9b8c75962c19bc0d3fba4d26a14142e6d80d97\",\"file_bytes\":1245,\"body_bytes\":184},{\"atom_id\":\"put-an-expiry-on-research\",\"file_sha256\":\"fd7c89988bdd9cd77f63bb29d157791656f848d1ed4e9643e96233ec203328cd\",\"content_sha256\":\"f65fb6d38e7b64194aa886205a441340b5f3498cea4a8785764ffac92d12da4a\",\"file_bytes\":1133,\"body_bytes\":136}]"
carrier_sha256: ea144b7cdb4d9a587df26bdbbd25791674a1368b1704dc8cd7efc6fd47f257f7
carrier_bytes: 7009
revision: 1
status: active
---
<!-- vpmodule:atom:begin assign-each-capability-to-a-tier-before-the-research -->
---
instruction_id: assign-each-capability-to-a-tier-before-the-research
title: Assign each capability to a tier before the research
summary: "Each capability is mapped to its owner before the framework research starts, so a wrong assignment cannot propagate into the plans."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A set of capabilities is about to be researched.
conditions_does_not_apply_when: The application has a single layer.
artifact_contract_output_type: responsibility-map
artifact_contract_required_data:
  - each capability
  - the tier that owns it
  - the reason
artifact_contract_verified_by: every capability has a tier owner before the framework research begins
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Assign each capability to a tier before the research
Map each phase capability to its standard architectural tier owner before diving into framework research. This prevents tier misassignment from propagating into plans.
<!-- vpmodule:atom:end assign-each-capability-to-a-tier-before-the-research -->
<!-- vpmodule:atom:begin copy-the-locked-decisions-verbatim-into-the-research -->
---
instruction_id: copy-the-locked-decisions-verbatim-into-the-research
title: Copy the locked decisions verbatim into the research
summary: "The decisions that were already locked are copied as they stand, and the ideas that were deferred are not researched at all."
capability_tags:
  - research-primary-sources
pattern_tags:
  - frozen-intent
conditions_applies_when: The research starts and locked decisions exist.
conditions_does_not_apply_when: No decision has been locked yet.
artifact_contract_output_type: research-constraints
artifact_contract_required_data:
  - the locked decisions
  - the deferred ideas that are out of scope
artifact_contract_verified_by: the locked decisions are copied verbatim and the deferred ideas are listed as out of scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Copy the locked decisions verbatim into the research
copy locked decisions here verbatim. These MUST be honored by the planner.
[Copy from CONTEXT.md - do NOT research or plan these]
<!-- vpmodule:atom:end copy-the-locked-decisions-verbatim-into-the-research -->
<!-- vpmodule:atom:begin draw-the-flow-not-the-file-list -->
---
instruction_id: draw-the-flow-not-the-file-list
title: "Draw the flow, not the file list"
summary: The diagram shows how data moves through conceptual components so a reader can trace the use case by following the arrows.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A system is described with a diagram.
conditions_does_not_apply_when: The document describes a single file.
artifact_contract_output_type: flow-diagram
artifact_contract_required_data:
  - the entry points
  - the processing stages
  - the decision points
artifact_contract_verified_by: the primary use case can be traced from input to output by following the arrows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Draw the flow, not the file list
Architecture diagrams MUST show data flow through conceptual components, not file listings.
A reader should be able to trace the primary use case from input to output by following the arrows
File-to-implementation mapping belongs in the Component Responsibilities table, not in the diagram.
<!-- vpmodule:atom:end draw-the-flow-not-the-file-list -->
<!-- vpmodule:atom:begin list-the-problems-you-must-not-solve-yourself -->
---
instruction_id: list-the-problems-you-must-not-solve-yourself
title: List the problems you must not solve yourself
summary: "The research names the problems that look simple but have an existing solution, and says why the custom one is worse."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A domain is researched for the approach to use.
conditions_does_not_apply_when: The domain has no established solution.
artifact_contract_output_type: do-not-hand-roll-list
artifact_contract_required_data:
  - the problem
  - the solution to use instead
  - the reason
artifact_contract_verified_by: the list names what must not be built by hand and what to use instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# List the problems you must not solve yourself
Don't hand-roll: Be explicit about what problems to NOT solve yourself
**Key insight:** [why custom solutions are worse in this domain]
<!-- vpmodule:atom:end list-the-problems-you-must-not-solve-yourself -->
<!-- vpmodule:atom:begin put-an-expiry-on-research -->
---
instruction_id: put-an-expiry-on-research
title: Put an expiry on the research
summary: The research carries the date it was done and the date it stops being usable.
capability_tags:
  - research-primary-sources
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A research document is written.
conditions_does_not_apply_when: The findings are about a fixed artefact that does not change.
artifact_contract_output_type: research-validity-window
artifact_contract_required_data:
  - the research date
  - the date the findings expire
artifact_contract_verified_by: the document names the research date and the date the findings stop being usable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Put an expiry on the research
**Research date:** [date]
**Valid until:** [estimate - 30 days for stable tech, 7 days for fast-moving]
<!-- vpmodule:atom:end put-an-expiry-on-research -->