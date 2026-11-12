---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-technical-md-9080628a-c01"
title: "bmad-method: skills/bmad-deep-recon/types/technical.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-deep-recon/types/technical.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/technical.md\"}"
atom_ids:
  - assess-a-technology-area-before-adopting-it
  - favor-production-numbers-over-advocacy
  - re-check-a-pain-point-against-the-current-version
  - read-the-project-history-not-its-snapshot
  - read-the-retrospective-not-the-launch
atom_count: 5
atoms: "[{\"atom_id\":\"assess-a-technology-area-before-adopting-it\",\"file_sha256\":\"bb82331131ea496f1ea0cd1a4ee2c4a76fa32cf52ca3c1d4800f22429000a488\",\"content_sha256\":\"13fc7fb73d903e95d8cb4cd86db3e44d09af555110634a81cdc553f8ebdb8ac1\",\"file_bytes\":2094,\"body_bytes\":763},{\"atom_id\":\"favor-production-numbers-over-advocacy\",\"file_sha256\":\"01b9ebbf2a74bc55dd4ecb519496bf2e47ad91bd2552bd12d955cba9d4457f5b\",\"content_sha256\":\"7e0ba22b8751624eabc4685cd2cc6e8293142ba894474a48f1ec7b45390cd6c3\",\"file_bytes\":1155,\"body_bytes\":94},{\"atom_id\":\"re-check-a-pain-point-against-the-current-version\",\"file_sha256\":\"e71a586a5de202957d661ccb784596a5db173e445df41507c6f08615622e9091\",\"content_sha256\":\"e586858bd6d17fc83cb6c34e987b0386fad29f67e9cf370f2594d8b00a314c0d\",\"file_bytes\":1346,\"body_bytes\":177},{\"atom_id\":\"read-the-project-history-not-its-snapshot\",\"file_sha256\":\"070872260706233eeea12e133e0dddaeb2aa9792dd71f0e7925d10c5ea64420d\",\"content_sha256\":\"5110a8e76c4411f69515f05f5771a50d1f715c76382713633f471bf69702db20\",\"file_bytes\":1310,\"body_bytes\":151},{\"atom_id\":\"read-the-retrospective-not-the-launch\",\"file_sha256\":\"f70c10d1edc5d1647138e61fb764c3254558542b847cd37703a3b26512c77454\",\"content_sha256\":\"8f36fff4271f683f3866c0c06183d346892933bfe07c5f64f58a206a5c96ba11\",\"file_bytes\":1217,\"body_bytes\":96}]"
carrier_sha256: 51956a50328d6085e86a11b0dc22d1e5d1199eaf825ab434915eb85aaa634231
carrier_bytes: 7827
revision: 1
status: active
---
<!-- vpmodule:atom:begin assess-a-technology-area-before-adopting-it -->
---
instruction_id: assess-a-technology-area-before-adopting-it
title: Assess a technology area before adopting it
summary: "Adopt a technology area, design an integration approach or ground an architecture with the landscape and its maturity, the integration reality, the patterns that dominate in practice and the health of the ecosystem."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A decision is about to adopt a technology area or commit a roadmap to it.
conditions_does_not_apply_when: The decision is about a single library version or a single dependency; that is a dependency review.
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the decision the study serves
  - the five dimensions in priority order
  - what each dimension contributes to the decision
artifact_contract_verified_by: the study answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Assess a technology area before adopting it
Serves: adopt a technology area, design an integration approach, ground an architecture in current practice, assess feasibility before committing a roadmap.

1. Landscape & maturity — dominant approaches, what's consolidating vs churning, what the current generation newly makes possible
2. Integration & interoperability — protocols, formats, auth patterns, where integrations actually hurt
3. Architecture patterns in practice — which named patterns dominate at what scale, and what the failures teach
4. Implementation reality — learning curve, tooling, operational burden, what teams say 6–12 months in
5. Ecosystem health — contributor/release vitality, backing durability, the five-year regret risk
<!-- vpmodule:atom:end assess-a-technology-area-before-adopting-it -->
<!-- vpmodule:atom:begin favor-production-numbers-over-advocacy -->
---
instruction_id: favor-production-numbers-over-advocacy
title: Favor production numbers over advocacy
summary: Favor the accounts that carry production numbers over the ones that carry advocacy.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Accounts of a technology in use are weighed against each other.
conditions_does_not_apply_when: No account carries numbers and the choice is between advocacy accounts alone.
artifact_contract_output_type: account-weight
artifact_contract_required_data:
  - the accounts read
  - the numbers each account carries
artifact_contract_verified_by: every account weighed is marked as carrying production numbers or not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Favor production numbers over advocacy
favor accounts with production numbers over advocacy
<!-- vpmodule:atom:end favor-production-numbers-over-advocacy -->
<!-- vpmodule:atom:begin re-check-a-pain-point-against-the-current-version -->
---
instruction_id: re-check-a-pain-point-against-the-current-version
title: Re-check a pain point against the current version
summary: "Before citing a pain point, check whether it was since fixed; an old complaint against a current version is a false claim."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A complaint from an earlier version is cited as a current problem.
conditions_does_not_apply_when: No later release exists since the complaint was reported.
artifact_contract_output_type: claim-check
artifact_contract_required_data:
  - the pain point
  - the version it was reported against
  - whether it was fixed since
artifact_contract_verified_by: every cited pain point names the version it was reported against and states whether it was fixed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Re-check a pain point against the current version
before citing a pain point, check whether it was since fixed — an old complaint against a current version is a false claim
<!-- vpmodule:atom:end re-check-a-pain-point-against-the-current-version -->
<!-- vpmodule:atom:begin read-the-project-history-not-its-snapshot -->
---
instruction_id: read-the-project-history-not-its-snapshot
title: "Read the project history, not its snapshot"
summary: "Read a project's metrics over time and its issue tracker, never a snapshot: the tracker shows the gap between the docs and the reality."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "The health, the adoption or the direction of a project is to be established."
conditions_does_not_apply_when: The project has no issue tracker and no metric history.
artifact_contract_output_type: project-history
artifact_contract_required_data:
  - the metric history read
  - the issues read
  - the gap between the docs and the reality
artifact_contract_verified_by: every claim names the metric series or the issue it rests on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Read the project history, not its snapshot
read repository metrics over time, never snapshots
issue trackers reveal the gap between docs and reality
<!-- vpmodule:atom:end read-the-project-history-not-its-snapshot -->
<!-- vpmodule:atom:begin read-the-retrospective-not-the-launch -->
---
instruction_id: read-the-retrospective-not-the-launch
title: "Read the retrospective, not the launch"
summary: "Read the retrospective threads, not the launch threads: what a project reports after it shipped is worth more than what it promised before."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The real-world outcome of a technology is to be established.
conditions_does_not_apply_when: "No retrospective exists yet, because the technology has just been released."
artifact_contract_output_type: outcome-evidence
artifact_contract_required_data:
  - the retrospectives read
  - what they report after the launch
artifact_contract_verified_by: every account of an outcome comes from a retrospective thread
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Read the retrospective, not the launch
read the retrospective threads, not the launch threads
<!-- vpmodule:atom:end read-the-retrospective-not-the-launch -->