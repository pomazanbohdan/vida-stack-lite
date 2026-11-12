---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-project-skills-discovery-md-8a40a744-c01"
title: "gsd-core: gsd-core/references/project-skills-discovery.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/project-skills-discovery.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/project-skills-discovery.md\"}"
atom_ids:
  - carve-the-entry-by-relevance-not-by-size
  - load-the-index-and-only-the-rules-you-need
atom_count: 2
atoms: "[{\"atom_id\":\"carve-the-entry-by-relevance-not-by-size\",\"file_sha256\":\"3937c91dcd494a565f461cf68deb636062ca29169d42b95b1db894c5b66a4db3\",\"content_sha256\":\"9dc5018884a51a7e1464faaec61f8ac42ef9f6a88ab5d40dafd97a71dca9b740\",\"file_bytes\":2983,\"body_bytes\":1536},{\"atom_id\":\"load-the-index-and-only-the-rules-you-need\",\"file_sha256\":\"63a61c48847b03fab7657600c8c605397d10a1d515140043d6f30f5569df331b\",\"content_sha256\":\"65364a69418ff72a1b9d1cd0d09aa87338a8cd92606f047fb5cba7945ed0b541\",\"file_bytes\":1475,\"body_bytes\":394}]"
carrier_sha256: d26ebe1fda61691c6abff7d8d52af03f3deb6d93fcf8fcfe4fa0004bb1f5da74
carrier_bytes: 4737
revision: 1
status: active
---
<!-- vpmodule:atom:begin carve-the-entry-by-relevance-not-by-size -->
---
instruction_id: carve-the-entry-by-relevance-not-by-size
title: "Carve the entry by relevance, not by size"
summary: "Split a skill by what a run needs: the entry carries what every run needs, a reference carries a branch that loads only when it is reached, and nothing nests deeper than one level."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A skill is written in several files and it has to be decided what goes where.
conditions_does_not_apply_when: The skill is small enough to be one file.
artifact_contract_output_type: agent-skill-layout
artifact_contract_required_data:
  - the entry file
  - the reference list
  - what one run loads
artifact_contract_verified_by: one run loads the entry and only the branch it reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-progressive-disclosure.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/shape-plain-skill.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/project-skills-discovery.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Carve the entry by relevance, not by size
A skill is paid for every time it runs.
The entry file, `SKILL.md`, is read on every invocation; a reference is read only when the branch that names it is reached.
So the question is never "how big is the skill" but "how much does one run load".
Carve by relevance, not size.
What only some branches need goes in a reference; what every run needs stays in the entry.
A piece too small to repay the indirection stays inline, and a skill small enough to be one file is one file.
One level deep. The entry names a reference; a reference never names another.
The entry carries a short routing map when there are several.
Name a reference when its branch is reached, never ahead of it: "read `references/<topic>.md` fully and follow it".
Every file a model reads is held to the same standard as the entry: each reference, each capability file, each template a model reads as text.
A skill judged by its entry alone has most of its text unjudged.
Cut what a capable model would do unasked.
Instructions for exotic cases are paid on every run and the case is paid only when it occurs.
A plain skill's entry aims near 800 tokens, an agent's near 1,200.
A complex workflow is the right size at any total when each branch sits in its own file and loads only when reached; the same workflow loaded whole is too big at half the size.

Read the index of each project skill, then load only the specific rule files the current task needs; never load a whole large rules file - it costs significant context.
<!-- vpmodule:atom:end carve-the-entry-by-relevance-not-by-size -->
<!-- vpmodule:atom:begin load-the-index-and-only-the-rules-you-need -->
---
instruction_id: load-the-index-and-only-the-rules-you-need
title: Load the index and only the rules you need
summary: Project skills are read as a lightweight index; the individual rule files and the large agent instructions are loaded only when the task needs them.
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Project-defined skills exist for the repository.
conditions_does_not_apply_when: The repository defines no skills.
artifact_contract_output_type: skill-index
artifact_contract_required_data:
  - the skills found
  - the index read for each
  - the rule files loaded
artifact_contract_verified_by: the index was read and only the needed rule files were loaded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/project-skills-discovery.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load the index and only the rules you need
Before execution, check for project-defined skills and apply their rules
List available skills (subdirectories)
Read `SKILL.md` for each skill (lightweight index, typically ~130 lines)
Load specific `rules/*.md` files only as needed during the current task
Do NOT load full `AGENTS.md` files — they are large (100KB+) and cost significant context
<!-- vpmodule:atom:end load-the-index-and-only-the-rules-you-need -->