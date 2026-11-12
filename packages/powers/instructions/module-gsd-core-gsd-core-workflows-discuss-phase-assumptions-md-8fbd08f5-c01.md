---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-discuss-phase-assumptions-md-8fbd08f5-c01"
title: "gsd-core: gsd-core/workflows/discuss-phase-assumptions.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/discuss-phase-assumptions.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/discuss-phase-assumptions.md\"}"
atom_ids:
  - ask-for-corrections-not-answers
  - cite-the-evidence-and-the-consequence-for-every-assumption
  - defer-a-new-capability-instead-of-adding-it
atom_count: 3
atoms: "[{\"atom_id\":\"ask-for-corrections-not-answers\",\"file_sha256\":\"186c3aab031c613ba693b0466e06586e96bf67a3332d984570fadd47119a3514\",\"content_sha256\":\"a5f9ea32f1d5bcc0228c2346db21c1f6f08d4146dfb6d750acef11482197dc44\",\"file_bytes\":1580,\"body_bytes\":355},{\"atom_id\":\"cite-the-evidence-and-the-consequence-for-every-assumption\",\"file_sha256\":\"231c1703d19d2370e7138b916a3b728e991a2e3b17719f5a31a1b940b60bf494\",\"content_sha256\":\"dd3eab82359c4a53e020b3a703c152b38a1e9e4a2470cf7361112a60485e8faf\",\"file_bytes\":1549,\"body_bytes\":285},{\"atom_id\":\"defer-a-new-capability-instead-of-adding-it\",\"file_sha256\":\"d174e53c83938fb8e20473035bef7c900cde6b9a8f6149e359d67919c18897ba\",\"content_sha256\":\"4dc135a65b6bebcf15cf52d63b7cbe387377963518b4d08ce93965076212c8f1\",\"file_bytes\":1876,\"body_bytes\":409}]"
carrier_sha256: 50155ea8874cb03c77a9701065c8b5f24e241f573e41ea89457bed8df600aa5b
carrier_bytes: 5442
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-for-corrections-not-answers -->
---
instruction_id: ask-for-corrections-not-answers
title: "Ask for corrections, not answers"
summary: Analyse first and ask the user to correct a stated position instead of supplying the answer.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A discussion with a human is about to ask the user for information.
conditions_does_not_apply_when: The question is one no scan of the repository or the planning documents can settle.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the options considered
  - the recommended position
  - the evidence behind it
artifact_contract_verified_by: "the user is asked to correct a stated position, not to supply one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask for corrections, not answers
You are a thinking partner, not an interviewer. Analyze the codebase deeply, surface what you believe based on evidence, and ask the user only to correct what's wrong.
Read the codebase FIRST, form opinions SECOND, ask ONLY about what's genuinely unclear
Minimize user interactions: ~2-4 corrections vs ~15-20 questions
<!-- vpmodule:atom:end ask-for-corrections-not-answers -->
<!-- vpmodule:atom:begin cite-the-evidence-and-the-consequence-for-every-assumption -->
---
instruction_id: cite-the-evidence-and-the-consequence-for-every-assumption
title: Cite the evidence and the consequence for every assumption
summary: "Every assumption names the evidence it rests on, what breaks when it is wrong, and how confident it is."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: An assumption is put to the user as a decision to confirm.
conditions_does_not_apply_when: "The item is a plain fact taken from a source, not an assumption."
artifact_contract_output_type: assumption-record
artifact_contract_required_data:
  - the assumption
  - the evidence
  - the consequence if wrong
  - the confidence
artifact_contract_verified_by: every assumption names the files it came from and what breaks when it is wrong
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Cite the evidence and the consequence for every assumption
Every assumption must cite evidence (file paths, patterns found)
Every assumption must state consequences if wrong
Display all assumptions grouped by area with confidence badges.
**Confidence:** Confident | Likely | Unclear
<!-- vpmodule:atom:end cite-the-evidence-and-the-consequence-for-every-assumption -->
<!-- vpmodule:atom:begin defer-a-new-capability-instead-of-adding-it -->
---
instruction_id: defer-a-new-capability-instead-of-adding-it
title: Defer a new capability instead of adding it
summary: "The scope boundary is fixed; a request for a new capability is recorded as deferred, not started."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The user asks for something that belongs to another unit of work.
conditions_does_not_apply_when: The request clarifies how the scoped work is to be done.
artifact_contract_output_type: deferred-item
artifact_contract_required_data:
  - the requested capability
  - the scope it was deferred to
artifact_contract_verified_by: the idea is recorded as deferred and no work was started on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Defer a new capability instead of adding it
The phase boundary comes from ROADMAP.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.
Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
Heuristic: Does this clarify how we implement what's already in the phase, or does it add a new capability that could be its own phase?
<!-- vpmodule:atom:end defer-a-new-capability-instead-of-adding-it -->