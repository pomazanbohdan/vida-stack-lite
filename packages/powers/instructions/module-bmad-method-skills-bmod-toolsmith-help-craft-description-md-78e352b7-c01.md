---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-toolsmith-help-craft-description-md-78e352b7-c01"
title: "bmad-method: skills/bmod-toolsmith/help/craft-description.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmod-toolsmith/help/craft-description.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-toolsmith/help/craft-description.md\"}"
atom_ids:
  - name-the-sibling-when-a-sibling-takes-the-requests
  - revise-the-description-from-the-failures-not-the-queries
  - write-the-body-around-the-output
  - write-the-description-as-a-summary-and-trigger-phrases
atom_count: 4
atoms: "[{\"atom_id\":\"name-the-sibling-when-a-sibling-takes-the-requests\",\"file_sha256\":\"d68d50aebedecbe4978aef0e5fbba2a73b0b21b323aa1a4af536a4d320a306ae\",\"content_sha256\":\"d903214aee90295be69f627f0a8755aed5abf44b6258731d63f62d87a946c871\",\"file_bytes\":1885,\"body_bytes\":530},{\"atom_id\":\"revise-the-description-from-the-failures-not-the-queries\",\"file_sha256\":\"4a5dddb8833d55d093baaf33d87a9ce646a266cb719519f53ca89f7c317d64d5\",\"content_sha256\":\"1689529f812d3ee01d95f13a128df7692b2f224a6329b9afa5f301ebfb2b10ba\",\"file_bytes\":1816,\"body_bytes\":449},{\"atom_id\":\"write-the-body-around-the-output\",\"file_sha256\":\"85663cdf3f4140e2fce90013d078067a6e5681acfd48d89897f635fb13689280\",\"content_sha256\":\"62cb47f1da6668a5191633040a20434c6ee581b26237e54abce605d321769c7d\",\"file_bytes\":1755,\"body_bytes\":307},{\"atom_id\":\"write-the-description-as-a-summary-and-trigger-phrases\",\"file_sha256\":\"eb99c9eaf61e8d0a00597a657b0ac8920f77c888459f05a15cdf90b83614c163\",\"content_sha256\":\"3d57fc478d1d24f098d64b06913ddff044c84330f98fcf8da9e81546c490f0fc\",\"file_bytes\":2372,\"body_bytes\":1099}]"
carrier_sha256: 9cf625ac2bbe97d85111ee689cf8ddac79ed411cccc80f54951eb2a601de04ff
carrier_bytes: 8443
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-sibling-when-a-sibling-takes-the-requests -->
---
instruction_id: name-the-sibling-when-a-sibling-takes-the-requests
title: Name the sibling when a sibling takes the requests
summary: "A near miss is a request that shares the words and the domain but belongs to another skill; when one skill takes a sibling's requests, the description names that sibling and a should-not case that is obviously another skill teaches nothing."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Two skills answer requests that share words and domain.
conditions_does_not_apply_when: No other skill competes for the same requests.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the near miss
  - the sibling that owns it
  - the boundary line
artifact_contract_verified_by: the near-miss request reaches the sibling and not this skill
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-description.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the sibling when a sibling takes the requests
Near misses are requests that share words and domain but belong elsewhere: debugging a workflow versus building one, critiquing a brief versus writing one.
When a skill takes a sibling's requests, the description adds `Not for ...` naming that sibling; without a collision it stays at two parts.
the should-not queries matter most when they are near misses
A should-not query that obviously belongs to another skill teaches nothing, because any description already handles it.
<!-- vpmodule:atom:end name-the-sibling-when-a-sibling-takes-the-requests -->
<!-- vpmodule:atom:begin revise-the-description-from-the-failures-not-the-queries -->
---
instruction_id: revise-the-description-from-the-failures-not-the-queries
title: "Revise the description from the failures, not from the queries"
summary: "When an evaluation comes back with failures, change the situations and the boundaries that produced them, never paste the failed query's words into the description, and prove the rewrite on a held-out set."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger evaluation came back with failures.
conditions_does_not_apply_when: The skill has never been evaluated.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the failing queries
  - the situation or boundary that changed
  - the held-out set
artifact_contract_verified_by: "the revised description fixes the failure and no query's wording appears in it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-description.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Revise the description from the failures, not from the queries
A trigger eval runs a set of queries through the real runtime and records whether the skill loaded.
A description is revised from eval failures by changing its situations and boundaries, never by pasting a failed query's words into it.
A bounded optimization loop that improves the description against a held-out test set so the rewrite does not overfit to the cases it is graded on.
<!-- vpmodule:atom:end revise-the-description-from-the-failures-not-the-queries -->
<!-- vpmodule:atom:begin write-the-body-around-the-output -->
---
instruction_id: write-the-body-around-the-output
title: Write the body around the output
summary: "The body says what the skill produces, for whom and what must be true of the output, with exact steps only where a wrong move costs something; when to use it lives in the description alone."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The body of a skill has to be written.
conditions_does_not_apply_when: Only the description is being changed.
artifact_contract_output_type: agent-skill-body
artifact_contract_required_data:
  - what the skill produces
  - for whom
  - what must be true of the output
artifact_contract_verified_by: a reader can tell from the body alone what the skill produces and what a finished output looks like
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/shape-plain-skill.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-progressive-disclosure.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-description.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the body around the output
The body says what the skill produces, for whom, and what must be true of the output, with exact steps only where a wrong move costs something.
The description is the only place "when to use" lives; the body never repeats it.
Nothing in the body helps with that decision.
<!-- vpmodule:atom:end write-the-body-around-the-output -->
<!-- vpmodule:atom:begin write-the-description-as-a-summary-and-trigger-phrases -->
---
instruction_id: write-the-description-as-a-summary-and-trigger-phrases
title: Write the description as a summary and trigger phrases
summary: "The description is the only trigger: it carries a short third-person summary and the quoted phrases a user would really type, one phrase per situation, under a hard length ceiling."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - description-shape-policy
conditions_applies_when: The description of a skill has to be written or revised.
conditions_does_not_apply_when: The skill is only ever invoked by name and never competes for a request.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the one-line summary
  - the trigger phrases
  - the situations the phrases cover
artifact_contract_verified_by: the router finds the skill from the words the user would type
compatibility_excludes:
  - optimize-guidance-triggers
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-description.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write the description as a summary and trigger phrases
The description is the skill's only trigger.
The agent's router reads it, with every other installed skill's, and decides whether to load the skill.
It has two parts: a five-to-eight-word summary of what the skill does, in the third person, then `Use when the user says ...` with the quoted phrases a user would actually type.
Every installed description is paid on every session, so it stays that short; 1024 characters is the hard ceiling, not a target.
One phrase per situation; a synonym stack adds length and no reach.
Describe the user's problem, not the tool's symptom: "release notes from merged PRs", not "changelog generation".
a skill that must fire unasked describes the context instead
An agent is the exception to keeping it short.
Its `Use when` starts with the user asking for it by name, then lists the phrases of every capability built into it, since nothing else triggers those capabilities.
The summary stays short; the list does not.
A skill only ever called by name, such as a slash command, gets a one-line description
<!-- vpmodule:atom:end write-the-description-as-a-summary-and-trigger-phrases -->