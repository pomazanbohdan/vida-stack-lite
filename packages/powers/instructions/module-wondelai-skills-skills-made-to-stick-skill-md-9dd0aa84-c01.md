---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-made-to-stick-skill-md-9dd0aa84-c01"
title: "wondelai-skills: skills/made-to-stick/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/made-to-stick/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/made-to-stick/SKILL.md\"}"
atom_ids:
  - made-to-stick-common-mistakes
  - made-to-stick-concrete
  - made-to-stick-credible
  - made-to-stick-curse-of-knowledge
  - made-to-stick-demos
  - made-to-stick-diagnostic
  - made-to-stick-emotional
  - made-to-stick-landing-pages
atom_count: 8
atoms: "[{\"atom_id\":\"made-to-stick-common-mistakes\",\"file_sha256\":\"8fd17e67b1928885b6cccc3531d55ed57c796f96842357d2dca0c6eee54fad1b\",\"content_sha256\":\"21530da943bb9ea2df4e72abe48ab77df96ef524ebb5bc9bc2eb6a7a98b0baa4\",\"file_bytes\":1531,\"body_bytes\":468},{\"atom_id\":\"made-to-stick-concrete\",\"file_sha256\":\"b0ac7b9490c2c5a60f3d10b37c617b4a30e8998e106403bee759fc01616f4d8d\",\"content_sha256\":\"295a7be2afd45ddf589d179b1c933514dfd50a2b28bc3f1e9f48a022b0a62b01\",\"file_bytes\":1222,\"body_bytes\":158},{\"atom_id\":\"made-to-stick-credible\",\"file_sha256\":\"88c1a0a59c60f0671e32c31ef258ce6756fd017c7f1a635523139f09fb808718\",\"content_sha256\":\"4251f7c6ae62f368b42eeae413058ff193afa3a270879d13d1103e288d180ba7\",\"file_bytes\":1343,\"body_bytes\":241},{\"atom_id\":\"made-to-stick-curse-of-knowledge\",\"file_sha256\":\"f08590e847dc5cd3257e1cc4043613419735df8fbb3762a6f6e29a6092563f92\",\"content_sha256\":\"f1550a251d92b90b9cbe4e475a81df246a91689735b793fa0940d5baa9037250\",\"file_bytes\":1336,\"body_bytes\":248},{\"atom_id\":\"made-to-stick-demos\",\"file_sha256\":\"4163c329bee4402609b0594e77434e8d2c5b32040e80d608f3469f7d94fc81c6\",\"content_sha256\":\"92507aed69f74937bbbde74a66c6a18a263ba63d5e50f21fb0321f5ab9d13ebd\",\"file_bytes\":1330,\"body_bytes\":223},{\"atom_id\":\"made-to-stick-diagnostic\",\"file_sha256\":\"6ab7141b9f1058b816bbdf896d49c8821323246f5b5e61e6ba98f37269f49c02\",\"content_sha256\":\"94233c859d2ac4aaabac2292c0f858643ef827eba170aa90ffa16b2c2e01ac36\",\"file_bytes\":1720,\"body_bytes\":658},{\"atom_id\":\"made-to-stick-emotional\",\"file_sha256\":\"8fe7840f1fda64bc46a4d47860f0fa096dd8cfa3d018fd9a8419c7978b26160f\",\"content_sha256\":\"4126a433686f7c9cd7bbdfa9ce5406d1edd3955b96a8eb7965c2c8f14e6d18fc\",\"file_bytes\":1288,\"body_bytes\":208},{\"atom_id\":\"made-to-stick-landing-pages\",\"file_sha256\":\"a306dbde23d350238ae9684a639edeb078a33c031fd7099a4f2bf071921ea4d7\",\"content_sha256\":\"f1669b57a474f323c736af6c1b8a1d0c04dd96a37380b03707887363bc030771\",\"file_bytes\":1379,\"body_bytes\":228}]"
carrier_sha256: 38573b25c87704ac26fd1fc095acf7c8e876e5ccdad27d0321e927fb1b44db5c
carrier_bytes: 12008
revision: 1
status: active
---
<!-- vpmodule:atom:begin made-to-stick-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-common-mistakes
title: Avoid common stickiness mistakes
summary: "Avoid burying the lead, abstraction, feature lists, jargon and statistics without context; state each correction."
capability_tags:
  - write-technical-prose
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a message for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corresponding fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L214-L223"
status: active
revision: 1
---

# Avoid common stickiness mistakes

Check each mistake against its correction: burying the lead -> state the one core message (Commander's Intent); too abstract -> replace every abstraction with a concrete example; feature listing -> tell customer stories and show transformations; jargon -> test with outsiders; statistics without context -> make the numbers human-scale and relatable. State the correction for each mistake rather than referring to an unlisted list.
<!-- vpmodule:atom:end made-to-stick-common-mistakes -->
<!-- vpmodule:atom:begin made-to-stick-concrete -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-concrete
title: "Use concrete, sensory language"
summary: "Replace abstractions with sensory language, specific details, numbers and before/after outcomes."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Writing explanatory or persuasive content.
conditions_does_not_apply_when: A necessarily abstract mathematical or legal statement.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The message uses concrete examples or details that a reader can picture.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L79-L107"
status: active
revision: 1
---

# Use concrete, sensory language

Replace abstractions with sensory language and specific details; use concrete examples, numbers, and before/after outcomes.
<!-- vpmodule:atom:end made-to-stick-concrete -->
<!-- vpmodule:atom:begin made-to-stick-credible -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-credible
title: Support claims with credible evidence
summary: "Use external and internal credibility, vivid details, human-scale statistics, testable claims and a compelling example."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Making a claim that needs support.
conditions_does_not_apply_when: A claim already established by an authoritative citation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Statistics are placed in understandable context and claims are testable or exemplified.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L108-L134"
status: active
revision: 1
---

# Support claims with credible evidence

Support belief with external credibility and internal credibility, favoring vivid details, human-scale statistics, testable claims, and a compelling example; put statistics in understandable context.
<!-- vpmodule:atom:end made-to-stick-credible -->
<!-- vpmodule:atom:begin made-to-stick-curse-of-knowledge -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-curse-of-knowledge
title: Counter the Curse of Knowledge
summary: "Test messaging with outsiders, use concrete language and stories, and check whether an uninformed reader can understand."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Reviewing a message written by an expert.
conditions_does_not_apply_when: A message for a specialist audience that shares the context.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: An outsider can restate the message without expert context.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L181-L188"
status: active
revision: 1
---

# Counter the Curse of Knowledge

Counter the Curse of Knowledge by testing messaging with outsiders, using concrete rather than abstract language, telling stories rather than bullet lists, and checking whether an uninformed reader can understand.
<!-- vpmodule:atom:end made-to-stick-curse-of-knowledge -->
<!-- vpmodule:atom:begin made-to-stick-demos -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-demos
title: Frame product demos around a customer outcome
summary: "Show one core workflow, begin with the 'aha' moment, use real data and a specific company's use, and frame it as a customer problem and outcome."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Preparing a product demo.
conditions_does_not_apply_when: An exploratory internal test with no audience.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The demo reaches the 'aha' moment early and ends on a specific customer outcome."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L198-L204"
status: active
revision: 1
---

# Frame product demos around a customer outcome

For product demos, show one core workflow, begin with the 'aha' moment, use real data, show a specific company's use, and frame the demo as a customer's problem and outcome.
<!-- vpmodule:atom:end made-to-stick-demos -->
<!-- vpmodule:atom:begin made-to-stick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-diagnostic
title: Run the stickiness diagnostic
summary: "Ask the six diagnostic questions, identify weak traits and apply the matching fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a message.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: "The report scores each trait, fixes the lowest and rescores."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L224-L238"
status: active
revision: 1
---

# Run the stickiness diagnostic

Ask the six questions and apply the matching fix: Simple — can I state the core in one sentence? If not, find the Commander's Intent. Unexpected — would this surprise someone? If not, find the counterintuitive angle. Concrete — can I picture it happening? If not, add specific sensory details. Credible — why should someone believe this? If not, add proof, examples or the Sinatra Test. Emotional — does it make me feel something? If not, focus on one person rather than statistics. Stories — is there a story? If not, wrap the facts in a character, problem and resolution. Rescore after fixing the lowest trait.
<!-- vpmodule:atom:end made-to-stick-diagnostic -->
<!-- vpmodule:atom:begin made-to-stick-emotional -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-emotional
title: Make the message emotionally resonant
summary: "Focus on an individual, self-interest, identity or the relevant level of need without stretching emotion into abstraction."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Writing a message that should motivate action.
conditions_does_not_apply_when: A neutral technical reference.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The emotion is tied to a specific person or need rather than a vague appeal.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L135-L159"
status: active
revision: 1
---

# Make the message emotionally resonant

Make the message emotionally resonant by focusing on an individual, self-interest, identity, or the relevant level of need; avoid stretching emotion into abstraction.
<!-- vpmodule:atom:end made-to-stick-emotional -->
<!-- vpmodule:atom:begin made-to-stick-landing-pages -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-landing-pages
title: Make the landing page stick
summary: "State one clear value proposition above the fold, use a counterintuitive claim or statistic, specify outcomes, show proof and include pain and transformation."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Writing or reviewing a landing page.
conditions_does_not_apply_when: A utility page with no persuasion goal.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - value-proposition
  - supporting-proof
artifact_contract_verified_by: The page states one value proposition and supports it with specific proof.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L191-L197"
status: active
revision: 1
---

# Make the landing page stick

For landing pages, state one clear value proposition above the fold, use a counterintuitive claim or statistic, specify outcomes, show customer proof, and include customer pain and transformation.
<!-- vpmodule:atom:end made-to-stick-landing-pages -->