---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-domain-driven-design-skill-md-a58864ce-c01"
title: "wondelai-skills: skills/domain-driven-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/domain-driven-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/domain-driven-design/SKILL.md\"}"
atom_ids:
  - ddd-aggregates-and-value-objects
  - ddd-bounded-contexts
  - ddd-common-mistakes
  - ddd-core-domain
  - ddd-diagnostic
  - ddd-domain-events
  - ddd-model-the-business-domain
  - ddd-repositories-and-factories
atom_count: 8
atoms: "[{\"atom_id\":\"ddd-aggregates-and-value-objects\",\"file_sha256\":\"dfc1d5742525509d9ac00786c89e926d0201c1c83181d2cd6727db9e0d496d16\",\"content_sha256\":\"8312f05d5f41d260600aab203c7cde4576820aac4064ceb2cbd4f1e93c168a0d\",\"file_bytes\":1496,\"body_bytes\":312},{\"atom_id\":\"ddd-bounded-contexts\",\"file_sha256\":\"c890929103e807dce8b134a1bc6ba4658ae2128e4af3993b2903c197d5100c2a\",\"content_sha256\":\"bdfb6bc7cacea4ed2132a12e4986b732ab39e23003d62464a66689414652c882\",\"file_bytes\":1528,\"body_bytes\":385},{\"atom_id\":\"ddd-common-mistakes\",\"file_sha256\":\"055605371179b024d9e47fbb464e99ba0bb5d6520b5e4e8441e6a3fc12951fd2\",\"content_sha256\":\"a9b9ea826f62da74b022a27de277b8ab2109464c7d7b1520fc51152747710df6\",\"file_bytes\":1376,\"body_bytes\":276},{\"atom_id\":\"ddd-core-domain\",\"file_sha256\":\"03d529e2844d536bad82d3970ea0ea8e00789e95cc40dd0c474a11c3c26b3f80\",\"content_sha256\":\"8b95df052652d45eb501d0526e6d5507a1c495ce05ef6ffd2b682c7ce52d048c\",\"file_bytes\":1479,\"body_bytes\":313},{\"atom_id\":\"ddd-diagnostic\",\"file_sha256\":\"c05150fa2c3278e1ab676426941faa9a2c5f94bee49e483df253180a649a9ec2\",\"content_sha256\":\"1c9edd2d974d46330199ed6d17dba9a4a1a847df6126eef9aaefa5603abfbc02\",\"file_bytes\":1350,\"body_bytes\":249},{\"atom_id\":\"ddd-domain-events\",\"file_sha256\":\"ac251242436925b76153ffd7d1c1e164ce256be4a8fceace9c7c7951a61f23e9\",\"content_sha256\":\"89f945286cdf66abdd9b6a4acf2406bc8671efe766df6eeb2b569ea9a72956e5\",\"file_bytes\":1406,\"body_bytes\":268},{\"atom_id\":\"ddd-model-the-business-domain\",\"file_sha256\":\"07f4cffb0cd7e7aea782c82803292496d22e2e648a0e46a6dc3056d76ec75f63\",\"content_sha256\":\"7b398b591b219a7b6ee7dca0330faba36bd70c49c4ee2f7e17d292a4816d66a5\",\"file_bytes\":1363,\"body_bytes\":210},{\"atom_id\":\"ddd-repositories-and-factories\",\"file_sha256\":\"4853187f1e705b1632b62661f818ea3ccd4a0a82f659897658186ee650243ecf\",\"content_sha256\":\"01492a523fc91e87d7003b6f657b2c18e32610a8a273e032ce99985c03a8e320\",\"file_bytes\":1481,\"body_bytes\":309}]"
carrier_sha256: 580cba7f226c4ac3640210987a1531a65e17f733b8f731b500f364575ab1ff61
carrier_bytes: 12294
revision: 1
status: active
---
<!-- vpmodule:atom:begin ddd-aggregates-and-value-objects -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-aggregates-and-value-objects
title: "Model entities, value objects and aggregates"
summary: "Use identity for entities, immutable attributes for value objects and small aggregates with one consistency boundary; reference other aggregates by ID."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Modeling domain objects and consistency boundaries.
conditions_does_not_apply_when: A read-only projection with no domain invariants.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each aggregate has one root and a small consistency boundary, and other aggregates are referenced by ID."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L70-L93"
status: active
revision: 1
---

# Model entities, value objects and aggregates

Model entities by persistent identity, value objects by immutable attributes, and aggregates as consistency boundaries with one root. Prefer value objects, keep aggregates small, reference other aggregates by ID, and allow eventual consistency between aggregates.
<!-- vpmodule:atom:end ddd-aggregates-and-value-objects -->
<!-- vpmodule:atom:begin ddd-bounded-contexts -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-bounded-contexts
title: Define bounded contexts and map their relationships
summary: "Set explicit model boundaries, map translation between contexts, and protect the core with an Anti-Corruption Layer."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Defining domain boundaries or integrating models from different contexts.
conditions_does_not_apply_when: A single-context system with no boundary decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each context has an explicit boundary and foreign models are translated at the edge.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L46-L69"
status: active
revision: 1
---

# Define bounded contexts and map their relationships

Define explicit model boundaries where domain meanings apply, and map relationships and translation between contexts. Do not equate a bounded context with a microservice; prevent foreign models from leaking into the core with an Anti-Corruption Layer, govern shared kernels and map current boundaries before defining target ones.
<!-- vpmodule:atom:end ddd-bounded-contexts -->
<!-- vpmodule:atom:begin ddd-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-common-mistakes
title: Avoid common domain-modeling mistakes
summary: "Avoid technical-only names, one universal model, oversized aggregates, anemic models, unprotected integrations and skipped domain experts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a domain model for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the domain-centered correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L162-L173"
status: active
revision: 1
---

# Avoid common domain-modeling mistakes

Avoid technical-only names, one universal model, oversized aggregates, anemic models, unprotected external integrations, treating contexts as deployment units, and skipping domain experts; apply the listed domain-centered corrections.
<!-- vpmodule:atom:end ddd-common-mistakes -->
<!-- vpmodule:atom:begin ddd-core-domain -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-core-domain
title: Identify and protect the core domain
summary: "Distinguish core, supporting and generic subdomains; concentrate strong modeling on the core and buy or reuse commodity capabilities."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Prioritizing modeling effort or deciding what to build versus buy.
conditions_does_not_apply_when: A system with no differentiated business capability.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The core domain is named and receives the strongest modeling effort; supporting areas are not over-engineered.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L140-L161"
status: active
revision: 1
---

# Identify and protect the core domain

Identify the Core Domain and distinguish supporting and generic subdomains; concentrate strong modeling and experienced developers on the core, avoid over-engineering supporting areas, and buy or reuse commodity capabilities. Reassess what is core as the business changes.
<!-- vpmodule:atom:end ddd-core-domain -->
<!-- vpmodule:atom:begin ddd-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-diagnostic
title: Run the DDD diagnostic
summary: "Check domain language, context boundaries, aggregate size, behavior-rich objects, event use, integration translation and core-domain identification."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a domain model.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L174-L185"
status: active
revision: 1
---

# Run the DDD diagnostic

Use the seven diagnostic questions to check domain language, explicit context boundaries, aggregate size, behavior-rich domain objects, event use, translation at external integrations and identification of the Core Domain.
<!-- vpmodule:atom:end ddd-diagnostic -->
<!-- vpmodule:atom:begin ddd-domain-events -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-domain-events
title: Represent domain facts as events
summary: "Use immutable past-tense domain events, distinguish internal from integration events, and publish only meaningful state changes."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Modeling state changes or decoupling domain components in time.
conditions_does_not_apply_when: A state change that no domain expert needs to observe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Domain events are immutable, past-tense and distinct from cross-boundary integration events."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L94-L116"
status: active
revision: 1
---

# Represent domain facts as events

Represent domain facts that matter to experts as immutable past-tense events. Distinguish internal domain events from cross-boundary integration events; use events for temporal decoupling, and publish only meaningful state changes.
<!-- vpmodule:atom:end ddd-domain-events -->
<!-- vpmodule:atom:begin ddd-model-the-business-domain -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-model-the-business-domain
title: Model from a deep understanding of the domain
summary: Build software from a shared understanding of the business domain and express that language directly in code.
capability_tags:
  - design-structure
pattern_tags:
  - domain-language
conditions_applies_when: Designing a domain model for a business area.
conditions_does_not_apply_when: A purely technical component with no business domain meaning.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The model uses the domain language and can evolve with the business rather than encoding a technical-only structure.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L14-L17"
status: active
revision: 1
---

# Model from a deep understanding of the domain

Build software from a deep, shared understanding of the business domain; express the shared language directly in code so the model can evolve with the business.
<!-- vpmodule:atom:end ddd-model-the-business-domain -->
<!-- vpmodule:atom:begin ddd-repositories-and-factories -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-repositories-and-factories
title: Hide persistence behind repositories and factories
summary: Put repository interfaces in the domain and implementations in infrastructure; use domain language and reserve factories for complex creation.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Persisting aggregates or creating complex domain objects.
conditions_does_not_apply_when: A simple CRUD store with no domain model.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Persistence is hidden behind a domain-language interface and aggregates are created in valid states.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L117-L139"
status: active
revision: 1
---

# Hide persistence behind repositories and factories

Use repositories to hide persistence and factories to ensure aggregates are created in valid states. Put repository interfaces in the domain and implementations in infrastructure; use domain language in methods and reserve factories for complex creation.
<!-- vpmodule:atom:end ddd-repositories-and-factories -->