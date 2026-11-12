---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-thinking-models-research-md-5f47a0f2-c01"
title: "gsd-core: gsd-core/references/thinking-models-research.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/thinking-models-research.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/thinking-models-research.md\"}"
atom_ids:
  - decompose-a-recommendation-to-its-constraints-before-you-trust-it
  - look-for-the-projects-that-abandoned-the-approach
  - search-against-your-own-recommendation-before-you-report-it
  - steel-man-the-alternative-before-you-recommend-against-it
atom_count: 4
atoms: "[{\"atom_id\":\"decompose-a-recommendation-to-its-constraints-before-you-trust-it\",\"file_sha256\":\"0d1aeaa681f753fb39cfedd7449c0330e140eab3a5e7100684e3e9928223a803\",\"content_sha256\":\"31e006abc91bb199c673df11cfc2d57862038884017984a684b3e3d504d17c7a\",\"file_bytes\":1725,\"body_bytes\":515},{\"atom_id\":\"look-for-the-projects-that-abandoned-the-approach\",\"file_sha256\":\"94f86655c7185995c69cb32a44ce995790c38ef94b108dbd63ec1f667691643c\",\"content_sha256\":\"408b1720e44585487bd020c596194410a2b7c532f47ca50e0c423703f9177560\",\"file_bytes\":1637,\"body_bytes\":508},{\"atom_id\":\"search-against-your-own-recommendation-before-you-report-it\",\"file_sha256\":\"081cf823cebd326e07944bb788ce5a9bcb378366724c02ce2fd94d68d17bf5d0\",\"content_sha256\":\"9c1a649a37a4bfe228d04305cfa0f5668a53b71188e8b240624912a42c77b343\",\"file_bytes\":1684,\"body_bytes\":536},{\"atom_id\":\"steel-man-the-alternative-before-you-recommend-against-it\",\"file_sha256\":\"efdac0bf93a61e474b314625663e5a033463fe699c098878dcc4826e8920403c\",\"content_sha256\":\"147fe7491f9d22498bd006cde462b1ae760c0fb48b92ba123091539886ac3a88\",\"file_bytes\":1692,\"body_bytes\":521}]"
carrier_sha256: c109a0fcddade6923f03f613c60179b511edbd9e776b6437ead20b9e3c38281b
carrier_bytes: 7429
revision: 1
status: active
---
<!-- vpmodule:atom:begin decompose-a-recommendation-to-its-constraints-before-you-trust-it -->
---
instruction_id: decompose-a-recommendation-to-its-constraints-before-you-trust-it
title: Decompose a recommendation to its constraints before you trust it
summary: A recommendation is taken apart to the requirements it must satisfy; a recommendation that cannot be explained from those is marked low confidence.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A technology or pattern recommendation is about to be accepted.
conditions_does_not_apply_when: The recommendation is a plain factual lookup.
artifact_contract_output_type: recommendation-rationale
artifact_contract_required_data:
  - the problem it solves
  - the non-negotiable requirements
  - the confidence
artifact_contract_verified_by: the recommendation was decomposed to its constraints and the confidence follows the explanation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Decompose a recommendation to its constraints before you trust it
Before accepting any technology recommendation or architectural pattern, decompose it to its fundamental constraints: What problem does this solve? What are the non-negotiable requirements? What are the physical/logical limits? Build your recommendation UP from these constraints rather than DOWN from conventional wisdom. If you cannot explain WHY a recommendation is correct from first principles, flag it as `[LOW]` regardless of source count.
<!-- vpmodule:atom:end decompose-a-recommendation-to-its-constraints-before-you-trust-it -->
<!-- vpmodule:atom:begin look-for-the-projects-that-abandoned-the-approach -->
---
instruction_id: look-for-the-projects-that-abandoned-the-approach
title: Look for the projects that abandoned the approach
summary: "After the evidence for an approach is gathered, the projects that abandoned it are searched for and the negative evidence weighs more."
capability_tags:
  - research-primary-sources
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Evidence has been gathered for a recommended approach.
conditions_does_not_apply_when: The recommendation is a factual lookup with no alternatives.
artifact_contract_output_type: negative-evidence
artifact_contract_required_data:
  - the abandoned projects found
  - the weight given to the negative evidence
artifact_contract_verified_by: the search for abandonment evidence was run and reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Look for the projects that abandoned the approach
After gathering evidence FOR a recommended approach, actively search for projects that ABANDONED it. Check GitHub issues for "migrated away from", "replaced X with", or "problems with X at scale". A technology with 10 success stories and 100 quiet failures looks great until you check the graveyard. Weight negative evidence (migration-away stories, deprecation notices, unresolved issues) MORE heavily than positive evidence -- failures are underreported
<!-- vpmodule:atom:end look-for-the-projects-that-abandoned-the-approach -->
<!-- vpmodule:atom:begin search-against-your-own-recommendation-before-you-report-it -->
---
instruction_id: search-against-your-own-recommendation-before-you-report-it
title: Search against your own recommendation before you report it
summary: One full research cycle is spent looking for the criticism of the recommendation; finding none means the search was too narrow.
capability_tags:
  - research-primary-sources
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A recommendation has been formed and is about to be reported.
conditions_does_not_apply_when: The research is a factual lookup of a single technology.
artifact_contract_output_type: disconfirming-pass
artifact_contract_required_data:
  - the search terms used
  - the disconfirming evidence found
  - the caveat it produced
artifact_contract_verified_by: one full cycle against the recommendation was run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Search against your own recommendation before you report it
After forming your initial recommendation, spend one full research cycle searching AGAINST it. Use search terms like "{technology} problems", "{technology} alternatives", "why not {technology}", "{technology} vs {competitor}". For each piece of disconfirming evidence found, either (a) refute it with higher-confidence sources, or (b) add it as a caveat to your recommendation. If you cannot find ANY criticism of your recommendation, your search was too narrow -- widen it
<!-- vpmodule:atom:end search-against-your-own-recommendation-before-you-report-it -->
<!-- vpmodule:atom:begin steel-man-the-alternative-before-you-recommend-against-it -->
---
instruction_id: steel-man-the-alternative-before-you-recommend-against-it
title: Steel-man the alternative before you recommend against it
summary: The strongest case for the alternative is built and shown next to the recommendation; a competitive alternative becomes a decision for the owner.
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: An alternative is about to be rejected in a recommendation.
conditions_does_not_apply_when: The decision was already locked by the owner.
artifact_contract_output_type: steel-man-comparison
artifact_contract_required_data:
  - the strongest case for the alternative
  - the honest comparison
  - the decision status
artifact_contract_verified_by: the steel-manned alternative is presented next to the recommendation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Steel-man the alternative before you recommend against it
Before recommending against an alternative technology or approach, construct its STRONGEST possible case. What would a passionate advocate say? What use cases does it serve better than your recommendation? What trade-offs favor it? Present the steel-manned alternative alongside your recommendation with an honest comparison. If the steel-manned alternative is competitive, flag the decision as `[NEEDS DECISION]` rather than making a unilateral recommendation
<!-- vpmodule:atom:end steel-man-the-alternative-before-you-recommend-against-it -->