---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-forge-idea-skill-md-04222c24-c01"
title: "bmad-method: skills/bmad-forge-idea/SKILL.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-forge-idea/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-forge-idea/SKILL.md\"}"
atom_ids:
  - distil-the-forged-idea-to-the-decisions
  - name-the-outcome-of-a-hardened-idea
  - sharpen-domain-language
atom_count: 3
atoms: "[{\"atom_id\":\"distil-the-forged-idea-to-the-decisions\",\"file_sha256\":\"c7534cea6d7e7be027d715b873a14c938ac9dfcbc122ea02494cdd2f39b191c1\",\"content_sha256\":\"ed87d8d007ca8044694d73df978fbbe861201a7dbf1d439cd6025ef73dc2eea7\",\"file_bytes\":1613,\"body_bytes\":392},{\"atom_id\":\"name-the-outcome-of-a-hardened-idea\",\"file_sha256\":\"2f8286f368a445be9c5602ff291c9e1757dab9723d91528bc60804638e27519a\",\"content_sha256\":\"2b3fff9bbb3f514604b36bdd0fba26666167d6fd6b31dc59e784e3b93a169185\",\"file_bytes\":2136,\"body_bytes\":885},{\"atom_id\":\"sharpen-domain-language\",\"file_sha256\":\"6e5b239a33c7a51ea05d6a3414ec2801a978e7a135c5f3c392acb61aa273b3de\",\"content_sha256\":\"05ac20415426fd5e95ae724348d2247c95556c6a76e578528d0df06ec1a69d6e\",\"file_bytes\":3181,\"body_bytes\":1943}]"
carrier_sha256: cdad533ad1ac5a74cc3ad8b6674d8238b762d99716c18edcfff223405f2d54dc
carrier_bytes: 7297
revision: 1
status: active
---
<!-- vpmodule:atom:begin distil-the-forged-idea-to-the-decisions -->
---
instruction_id: distil-the-forged-idea-to-the-decisions
title: Distil the forged idea to the decisions
summary: "The forged idea keeps only the decisions, the rejected options and the reasons that matter downstream; if it reads like a document, it is too long."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A hardening session produced something that is handed on.
conditions_does_not_apply_when: The session ended with the idea rejected or with nothing to hand on.
artifact_contract_output_type: forged-idea
artifact_contract_required_data:
  - the locked decisions
  - the rejected options
  - the reasons
artifact_contract_verified_by: the document holds the decisions and the reasons and nothing else
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-forge-idea/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body constrains a concise handoff from a hardening session, but the decisions may span domains and the source names no subject domain."
---

# Distil the forged idea to the decisions
Keep it extremely short: only the decisions, rejected options, and reasons that matter downstream, in the user's meaning.
Do not write a prose summary, template, or conversation recap.
If it reads like a document, it is too long.
A `lock` is an idea the user hardens — settled, not to be reopened; locks are what the forged idea is distilled from.
<!-- vpmodule:atom:end distil-the-forged-idea-to-the-decisions -->
<!-- vpmodule:atom:begin name-the-outcome-of-a-hardened-idea -->
---
instruction_id: name-the-outcome-of-a-hardened-idea
title: Name the outcome of a hardened idea
summary: "Better thinking is the goal, not an artefact: hardening the idea, rejecting it, or thinking it through are all complete outcomes."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A hardening session has to end and the result has to be named.
conditions_does_not_apply_when: The session ended with a decision the user already made elsewhere.
artifact_contract_output_type: session-outcome
artifact_contract_required_data:
  - the outcome
  - the reason for it
  - the record that supports it
artifact_contract_verified_by: the outcome is one of the three states and a rejection states its cause
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-forge-idea/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body governs outcomes of an unspecified idea-hardening conversation and names no supported product, business, research, engineering, UX, or concrete operational subject."
---

# Name the outcome of a hardened idea
The main goal is better thinking, not producing an artifact.
Strengthening an idea, rejecting it, or thinking it through more clearly are all complete outcomes.
Writing the forged idea to hand off to another workflow is optional.
If planning or dev skills are installed (`bmad-agent-po`, `bmad-prd`, `bmad-prfaq`, `bmad-build`), offer the forged idea to Sofia (`bmad-agent-po`) as the input she writes the initiative's requirements from; if none are, the file stands on its own.
Do not steer the conversation toward "shall we build it?"
The session can end in three valid states:
Hardened — the idea is stronger and specific enough to use.
Killed — the idea does not hold up. Say so plainly and record why. Finding that out early is a valid outcome.
Clearer — the user understands the idea better, but there is no hardened idea to hand off.
<!-- vpmodule:atom:end name-the-outcome-of-a-hardened-idea -->
<!-- vpmodule:atom:begin sharpen-domain-language -->
---
instruction_id: sharpen-domain-language
title: Sharpen domain language
summary: "Sharpen the project's shared language: challenge conflicting terms, propose precise canonical words, stress-test with scenarios, cross-check with code, and record terms inline."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: "The project's domain terms are fuzzy, overloaded, or contradict the code."
conditions_does_not_apply_when: The language is already precise and recorded.
artifact_contract_output_type: updated-glossary
artifact_contract_required_data:
  - canonical terms
  - avoid list
  - contradictions surfaced
artifact_contract_verified_by: each resolved term is recorded at the moment it is resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/domain-modeling/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-forge-idea/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Sharpen domain language
Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* the glossary for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)
### Challenge against the glossary
When the user uses a term that conflicts with the existing language in `GLOSSARY.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"
### Sharpen fuzzy language
When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."
### Discuss concrete scenarios
When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.
### Cross-reference with code
When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"
### Update GLOSSARY.md inline
When a term is resolved, update `GLOSSARY.md` right there. Don't batch these up: capture them as they happen. `GLOSSARY.md` should be totally devoid of implementation details. Do not treat `GLOSSARY.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.
Do not assume the user's terms are precise.
When a term is fuzzy or overloaded, name the ambiguity and ask for a precise choice before continuing.
For example, do not let `user`, `buyer`, and `payer` collapse into one entity unless the idea actually requires that.
<!-- vpmodule:atom:end sharpen-domain-language -->