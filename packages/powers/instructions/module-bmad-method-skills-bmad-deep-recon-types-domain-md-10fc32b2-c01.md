---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-domain-md-10fc32b2-c01"
title: "bmad-method: skills/bmad-deep-recon/types/domain.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-deep-recon/types/domain.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/domain.md\"}"
atom_ids:
  - build-the-glossary-in-domain-research
  - read-conference-keynotes-for-who-matters
  - read-regulator-sites-and-enforcement-actions
  - read-the-filings-for-industry-structure-and-sizing
  - study-a-domain-before-building-in-it
  - weigh-pending-regulatory-changes-with-current-text
atom_count: 6
atoms: "[{\"atom_id\":\"build-the-glossary-in-domain-research\",\"file_sha256\":\"455984145b7d45a699d45c66beddcaafb9a802504ba0da9353be16866b8306e2\",\"content_sha256\":\"a3e14f380b8194a661ec7926666a8db7716ec0c87d6fba63231d25d5224a09db\",\"file_bytes\":1205,\"body_bytes\":95},{\"atom_id\":\"read-conference-keynotes-for-who-matters\",\"file_sha256\":\"851f98852003547edd0e45bd4d3cc5d0dadd428d3fc19152fe7832e90ba4dc2d\",\"content_sha256\":\"b989f024fffd0777fea4335d4dcd1ba262a6c6a3ceb56e54637b46c1be4a3a66\",\"file_bytes\":1140,\"body_bytes\":100},{\"atom_id\":\"read-regulator-sites-and-enforcement-actions\",\"file_sha256\":\"7c85b7ed68b0434eb0f7810f275fe71ac38146312a84962289bbf9d461dabb78\",\"content_sha256\":\"cc9ee870503145f26fcc3c58d5e1120e83f943ddf5d659be0680bcb7a9dbff34\",\"file_bytes\":1425,\"body_bytes\":204},{\"atom_id\":\"read-the-filings-for-industry-structure-and-sizing\",\"file_sha256\":\"fd329cbc65f87963c94f4a42b1b760ed1276e73b4df6918fc551e43d06b920ad\",\"content_sha256\":\"d8af234d8ca283aaa33c207694f337ea9267e932cfe6e8cde978a65185406e8b\",\"file_bytes\":1565,\"body_bytes\":187},{\"atom_id\":\"study-a-domain-before-building-in-it\",\"file_sha256\":\"e1eacd0a4c5b67c68bc26ebeca1d3cf69bd98bb1a071d0df99d3d98ec6ff9688\",\"content_sha256\":\"599836c348246aa5b5e60744bc3f551e28a0e2a416390199f5d277b5d02ad4cc\",\"file_bytes\":1984,\"body_bytes\":698},{\"atom_id\":\"weigh-pending-regulatory-changes-with-current-text\",\"file_sha256\":\"8ebb16526c394b5cc52278b629533dd24e84c3d993f322c186d62a24c15607d3\",\"content_sha256\":\"fe3fff9feb9b2328fa8ca2b439e743f7c05e5920e7d097d1d97c4f852f02dd6c\",\"file_bytes\":1355,\"body_bytes\":115}]"
carrier_sha256: dc652b220625ebb180926c6bc1c2c192a13640b3d54eaf7162f1671e4801bd33
carrier_bytes: 9535
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-the-glossary-in-domain-research -->
---
instruction_id: build-the-glossary-in-domain-research
title: Build the glossary in domain research
summary: "Domain research exists to build the glossary: the vocabulary and the implicit workflows practitioners think in are the deliverable."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: A domain is studied and the result is written up.
conditions_does_not_apply_when: The result is a measurement or a decision record; no vocabulary is at stake.
artifact_contract_output_type: domain-glossary
artifact_contract_required_data:
  - the terms
  - what each term is
  - the workflow each term belongs to
artifact_contract_verified_by: "the glossary carries the terms practitioners use and not the vendor's words"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Build the glossary in domain research
build the glossary — it's why domain research exists
<!-- vpmodule:atom:end build-the-glossary-in-domain-research -->
<!-- vpmodule:atom:begin read-conference-keynotes-for-who-matters -->
---
instruction_id: read-conference-keynotes-for-who-matters
title: Read conference keynotes for who actually matters
summary: Conference keynotes reveal who actually matters in a field; read them for the speakers.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The people and the groups that shape a field are to be identified.
conditions_does_not_apply_when: The players of the field are known and the question is about their products.
artifact_contract_output_type: speaker-signal
artifact_contract_required_data:
  - the keynotes read
  - the people they name
artifact_contract_verified_by: every name comes from a keynote that was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Read conference keynotes for who actually matters
conference keynotes reveal who actually matters
<!-- vpmodule:atom:end read-conference-keynotes-for-who-matters -->
<!-- vpmodule:atom:begin read-regulator-sites-and-enforcement-actions -->
---
instruction_id: read-regulator-sites-and-enforcement-actions
title: Read the regulator sites and their enforcement actions
summary: "Go to the regulator's own site for any load-bearing claim and read the enforcement actions to learn what is actually punished, not only what is written."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A regulatory obligation or a compliance claim is to be stated.
conditions_does_not_apply_when: "No regulator governs the claim, or the question is about an internal policy."
artifact_contract_output_type: regulatory-evidence
artifact_contract_required_data:
  - the regulator pages read
  - the enforcement actions read
  - what is actually punished
artifact_contract_verified_by: every regulatory claim names the regulator page or the enforcement action it rests on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Read the regulator sites and their enforcement actions
go to regulator sites directly for any load-bearing claim — and read enforcement actions to learn what's actually punished versus merely written
<!-- vpmodule:atom:end read-regulator-sites-and-enforcement-actions -->
<!-- vpmodule:atom:begin read-the-filings-for-industry-structure-and-sizing -->
---
instruction_id: read-the-filings-for-industry-structure-and-sizing
title: Read the filings for industry structure and sizing
summary: The industry sections of annual reports and public-company filings are structured teardowns and analyst-grade sizing; read them instead of paying for the analysis.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "The structure, the sizing or the trajectory of an industry is to be established."
conditions_does_not_apply_when: "The subject is a private company with no filings, or a single product rather than the industry."
artifact_contract_output_type: filing-evidence
artifact_contract_required_data:
  - the filings read
  - the industry section each filing carries
  - the figures taken from each section
artifact_contract_verified_by: every figure names the filing section it was taken from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - business
  - research
---

# Read the filings for industry structure and sizing
annual-report industry sections are free structured teardowns
public-company 10-K/S-1 industry sections are free analyst-grade sizing
<!-- vpmodule:atom:end read-the-filings-for-industry-structure-and-sizing -->
<!-- vpmodule:atom:begin study-a-domain-before-building-in-it -->
---
instruction_id: study-a-domain-before-building-in-it
title: Study a domain before building in it
summary: "Commit to building in an industry with the structure, the gatekeepers, the rules of the game, the practitioners' language and the technology adoption in hand."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A decision is about to be taken in an industry the team does not know.
conditions_does_not_apply_when: "The decision is about one company, one product or one technology rather than an industry."
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the decision the study serves
  - the five dimensions in priority order
  - what each dimension contributes to the decision
artifact_contract_verified_by: the study answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
  - business
  - research
  - operations
---

# Study a domain before building in it
Serves: commit to building in an industry, talk credibly with domain experts, scope a product for a regulated field, brief a team entering unfamiliar territory.

1. Industry structure & value chain — how value flows, who captures margin where
2. Key players & gatekeepers — incumbents, platforms, whose APIs/standards/marketplaces you build with or against
3. Rules of the game — laws, licenses, de-facto standards, what compliance costs a new entrant
4. Language & mental models — the vocabulary and implicit workflows practitioners think in
5. Technology adoption — the current technical baseline and where the industry sits on the adoption curve
<!-- vpmodule:atom:end study-a-domain-before-building-in-it -->
<!-- vpmodule:atom:begin weigh-pending-regulatory-changes-with-current-text -->
---
instruction_id: weigh-pending-regulatory-changes-with-current-text
title: Weigh pending regulatory changes with the current text
summary: A pending regulatory change matters as much as the text in force; read both before advising on a regulated field.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Advice is given on a regulated field.
conditions_does_not_apply_when: "No regulatory change is pending, or the claim is about the text in force only."
artifact_contract_output_type: regulatory-evidence
artifact_contract_required_data:
  - the text in force
  - the pending changes
artifact_contract_verified_by: both the text in force and every pending change are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body only names regulated-field advice and pending regulatory text; it does not identify an allowed domain, so assigning business or operations would add context absent from the source."
---

# Weigh pending regulatory changes with the current text
pending regulatory changes matter as much as current text
<!-- vpmodule:atom:end weigh-pending-regulatory-changes-with-current-text -->