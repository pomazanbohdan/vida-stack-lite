---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-improve-retention-skill-md-cd90ad6b-c02"
title: "wondelai-skills: skills/improve-retention/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/improve-retention/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/improve-retention/SKILL.md\"}"
atom_ids:
  - improve-retention-match
  - improve-retention-motivation
  - improve-retention-optimize
  - improve-retention-process
  - improve-retention-prompt
  - improve-retention-quick-diagnostic
  - improve-retention-recipe
  - improve-retention-scaling
atom_count: 8
atoms: "[{\"atom_id\":\"improve-retention-match\",\"file_sha256\":\"3816e01a230f6226535034052a91fb0c36a3c86150354fbd5d0f7845a0ce8b52\",\"content_sha256\":\"e8fe8b35fd4eb7a5c59429c9f415f4f0570ab1883a0eea94d17afec1918a3ce0\",\"file_bytes\":1196,\"body_bytes\":153},{\"atom_id\":\"improve-retention-motivation\",\"file_sha256\":\"d53b3071dbe9944b54d12474c54fe36d55ea5109f0269998d44eeacbdc47ba0f\",\"content_sha256\":\"daa9f92c9db7d80260a1dc0f7a7d00b73efc971fd2015e9a1cb71a8417d6dbe7\",\"file_bytes\":1801,\"body_bytes\":601},{\"atom_id\":\"improve-retention-optimize\",\"file_sha256\":\"655e63f15a976100af0e69a34b743ca0c6572caa736b0015f15a95efcb0bebbf\",\"content_sha256\":\"07d89df3ff12c6207be81daf525fd8efe539e66629c0279b567044f290e29277\",\"file_bytes\":1228,\"body_bytes\":151},{\"atom_id\":\"improve-retention-process\",\"file_sha256\":\"e7456a743233c380c88954b022a182715cf3e6538a88c6e25ada2986bdd64d2b\",\"content_sha256\":\"ef63f0db81a1788fd65ffe32398b2f3d69f00cd66f1aa314a364aae4d890773d\",\"file_bytes\":1243,\"body_bytes\":191},{\"atom_id\":\"improve-retention-prompt\",\"file_sha256\":\"f5a5c86a7b87cd6dea605a7e7f1f528dc1e8bf1c1b1e1c109df6465573b2bcbc\",\"content_sha256\":\"292efb494ae9504091bdbc012d07155ed0a33c60e57485be236c9b90d794d342\",\"file_bytes\":2007,\"body_bytes\":772},{\"atom_id\":\"improve-retention-quick-diagnostic\",\"file_sha256\":\"99aa8369fd3f59a87673aa5bba805a1cfa50221e86176dd9efd5b24ec85f24cc\",\"content_sha256\":\"b255c523d07a00e7427335123348db0db73521ed9e103c3502d2367cc35eea18\",\"file_bytes\":1821,\"body_bytes\":590},{\"atom_id\":\"improve-retention-recipe\",\"file_sha256\":\"d4da8fe802811184d62c1c564bf23ec14790bb4b30478a68d1b3b493e8b270a1\",\"content_sha256\":\"234b3c0ca1cda10b6c5bc50ae9bd498ad459f34346d616332f52c2e1a1774408\",\"file_bytes\":1496,\"body_bytes\":368},{\"atom_id\":\"improve-retention-scaling\",\"file_sha256\":\"9480be27b82343ee4b4eca0e690792bf7f09baa68e8718c85040639ddb419f18\",\"content_sha256\":\"be636db43c1d00986f874f9162b5fc1b0acae0cb904e2f72e2040435d626836c\",\"file_bytes\":1286,\"body_bytes\":208}]"
carrier_sha256: 65c611921fa662f0d383185c49d36ff27866417516770c29727a3b07eb95c25e
carrier_bytes: 12959
revision: 1
status: active
---
<!-- vpmodule:atom:begin improve-retention-match -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-match
title: Match behaviors with Focus Mapping
summary: "Assess each behavior for motivation and ease, then plot it on a 2x2 of impact versus feasibility."
capability_tags:
  - design-behavior-change
pattern_tags:
  - focus-mapping
conditions_applies_when: Choosing among candidate behaviors.
conditions_does_not_apply_when: A single behavior with no alternatives.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each candidate has an impact and feasibility position on the map.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L170-L172"
status: active
revision: 1
---

# Match behaviors with Focus Mapping

Assess each behavior for motivation and ease, then plot it on a 2×2 of impact versus feasibility (Focus Mapping).
<!-- vpmodule:atom:end improve-retention-match -->
<!-- vpmodule:atom:begin improve-retention-motivation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-motivation
title: Design for motivation troughs
summary: "Motivation is unreliable energy from sensation, anticipation and belonging; design for low-motivation moments, match required motivation to difficulty, and never invent a loss solely to drive a session."
capability_tags:
  - design-behavior-change
pattern_tags:
  - motivation-wave
conditions_applies_when: "Designing onboarding, re-engagement or messaging that depends on motivation."
conditions_does_not_apply_when: A design that does not depend on user motivation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design works at low motivation and no invented loss is used.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L43-L71"
status: active
revision: 1
---

# Design for motivation troughs

Motivation is energy for action from Sensation (pleasure/pain), Anticipation (hope/fear), and Belonging (acceptance/rejection); it fluctuates. Design for low-Motivation moments and match required Motivation to difficulty; do not rely on motivation-first tactics for sustained behavior. Onboarding should work after excitement fades; re-engagement assumes low Motivation and shows value before effort; fit messaging to the motivator. Fear about a streak is fair only if the loss is real and user-owned (data or progress); never invent a loss solely to drive a session.
<!-- vpmodule:atom:end improve-retention-motivation -->
<!-- vpmodule:atom:begin improve-retention-optimize -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-optimize
title: Optimize once the behavior is wired
summary: "Expand a behavior once it is wired, fix bottlenecks with the Ability Chain and refine prompt timing using data."
capability_tags:
  - design-behavior-change
pattern_tags: []
conditions_applies_when: Improving a behavior that already happens.
conditions_does_not_apply_when: A behavior that has not yet crossed the Action Line.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Expansion follows wiring evidence and uses the weakest link and prompt data.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L176-L180"
status: active
revision: 1
---

# Optimize once the behavior is wired

Expand a behavior once it is wired; fix bottlenecks with the Ability Chain and refine prompt timing using data.
<!-- vpmodule:atom:end improve-retention-optimize -->
<!-- vpmodule:atom:begin improve-retention-process -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-process
title: Follow the five-step behavior design process
summary: "Clarify the user's aspiration, explore possible behaviors, match behaviors, start tiny and optimize."
capability_tags:
  - design-behavior-change
pattern_tags:
  - behavior-design-steps
conditions_applies_when: Running a full behavior design effort.
conditions_does_not_apply_when: A narrow fix that does not need the full process.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: All five steps are addressed in order.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L160-L163"
status: active
revision: 1
---

# Follow the five-step behavior design process

Use the five-step behavior design process: clarify the user aspiration, explore possible behaviors, match behaviors, start tiny, and optimize.
<!-- vpmodule:atom:end improve-retention-process -->
<!-- vpmodule:atom:begin improve-retention-prompt -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-prompt
title: Design prompts above the Action Line
summary: "A prompt calls for action now; prompt only when motivation and ability suffice, tie prompts to real events or routines, cut unnecessary prompts, and never send copy that serves the product rather than the user."
capability_tags:
  - design-behavior-change
pattern_tags:
  - prompt-timing
conditions_applies_when: "Designing notifications, re-engagement or feature-discovery prompts."
conditions_does_not_apply_when: A prompt with no behavioral target.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each prompt names its event or anchor, its motivation and ability precondition, and the user need it serves."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L102-L129"
status: active
revision: 1
---

# Design prompts above the Action Line

A Prompt calls for action now; without one behavior does not occur regardless of Motivation and Ability. Person Prompts are internal, Context Prompts environmental, and Action Prompts product-designed. Prompts work only above the Action Line; otherwise notifications are spam. Time them to relevant moments, anchor new behavior to reliable routines, and avoid unnecessary prompts because each degrades future value. Notify only above the line; tie re-engagement to real events rather than schedules; prompt feature discovery when Motivation and Ability align. Never send copy serving product rather than user need. Cut prompts serving a metric but not the user's current goal; ask whether the user would appreciate each prompt now.
<!-- vpmodule:atom:end improve-retention-prompt -->
<!-- vpmodule:atom:begin improve-retention-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-quick-diagnostic
title: Run the Quick Diagnostic
summary: "Check the core action under 60 seconds, low-motivation operation, event or anchor prompts, immediate feedback, the weakest Ability Chain link and natural scaling; apply the matching action for each failed check."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a retention design.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L215-L225"
status: active
revision: 1
---

# Run the Quick Diagnostic

Check whether a new user can do the core action in under 60 seconds; if not, friction-audit and shrink to Starter Step. Check operation at low Motivation; if not, redesign for minimal Motivation. Check Prompts are tied to real events or anchors; otherwise switch to event/anchor prompts. Check immediate feedback after key actions; if absent add success, progress, or social feedback. Find weakest Ability link; if unknown rate all six factors 1–5 for the core behavior. Check users scale naturally; if not use Starter Steps and let behavior grow organically.
<!-- vpmodule:atom:end improve-retention-quick-diagnostic -->
<!-- vpmodule:atom:begin improve-retention-recipe -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-recipe
title: Use the Tiny Habits recipe
summary: "Use the recipe: after an existing reliable routine, perform the smallest version of the target behavior, then celebrate immediately; repetition alone does not wire the habit."
capability_tags:
  - design-behavior-change
pattern_tags:
  - tiny-habit-recipe
conditions_applies_when: Writing a repeatable habit instruction.
conditions_does_not_apply_when: A behavior that is not repeated.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The recipe names the anchor, the tiny behavior and the immediate celebration."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L134-L143"
status: active
revision: 1
---

# Use the Tiny Habits recipe

Use the recipe: After I [ANCHOR MOMENT], I will [TINY BEHAVIOR], then I [CELEBRATION]. The anchor must be an existing routine that reliably happens; the tiny behavior is the smallest version of the target; celebration is an immediate positive emotion that wires the habit. Repetition alone is insufficient without the feeling of success.
<!-- vpmodule:atom:end improve-retention-recipe -->
<!-- vpmodule:atom:begin improve-retention-scaling -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-scaling
title: Let tiny behaviors scale naturally
summary: "After a tiny behavior is wired, let it grow through motivation and momentum; never force scaling and treat the tiny version as the foundation."
capability_tags:
  - design-behavior-change
pattern_tags: []
conditions_applies_when: Growing a habit after the tiny behavior works.
conditions_does_not_apply_when: A behavior that has not yet been wired.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Scaling follows evidence that the tiny behavior is wired.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L154-L159"
status: active
revision: 1
---

# Let tiny behaviors scale naturally

After a tiny behavior is wired, allow it to grow naturally through motivation and momentum; never force scaling. Treat the tiny version as the foundation, not a failure.
<!-- vpmodule:atom:end improve-retention-scaling -->