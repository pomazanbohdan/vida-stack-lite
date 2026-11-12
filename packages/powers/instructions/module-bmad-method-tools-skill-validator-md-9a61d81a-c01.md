---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-tools-skill-validator-md-9a61d81a-c01"
title: "bmad-method: tools/skill-validator.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:tools/skill-validator.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"tools/skill-validator.md\"}"
atom_ids:
  - anchor-a-path-outside-the-unit-to-a-configured-root
  - anchor-an-internal-reference-to-the-file-that-holds-it
  - invoke-the-other-unit-instead-of-reaching-into-its-files
  - keep-the-rendering-machine-out-of-the-template
  - make-the-step-halt-where-the-menu-is
  - never-write-a-skip-instruction-into-a-workflow
  - resolve-every-placeholder-to-a-defined-source
  - write-the-path-inline-instead-of-through-a-variable
atom_count: 8
atoms: "[{\"atom_id\":\"anchor-a-path-outside-the-unit-to-a-configured-root\",\"file_sha256\":\"46016f01568e23167ce3faacee8954410979d62169ab557a837d7d855dc8ff13\",\"content_sha256\":\"3db74f506b6f5fa3c5bb48bdc9fd1ebfcdf324588ad4c3f8479aaeacb6210bf7\",\"file_bytes\":1502,\"body_bytes\":403},{\"atom_id\":\"anchor-an-internal-reference-to-the-file-that-holds-it\",\"file_sha256\":\"96d7476d4ca7e1d4d6c8c97b1cb7f8e28541a64715d9767373ab8480eaa6784c\",\"content_sha256\":\"033f626d722ee5e4b4a97cbf43756e8619c7383bc9b77822f7e085a74743aae5\",\"file_bytes\":1536,\"body_bytes\":371},{\"atom_id\":\"invoke-the-other-unit-instead-of-reaching-into-its-files\",\"file_sha256\":\"777947b83f364439610a3bf3193d56827310770c0b1a991daf49ad135526bd01\",\"content_sha256\":\"b6ef6ce221585805fcc787f563cd43b81b3a1616e5b75006d966c5cb297ab34d\",\"file_bytes\":2286,\"body_bytes\":843},{\"atom_id\":\"keep-the-rendering-machine-out-of-the-template\",\"file_sha256\":\"3206b0b9ab949cd224a511f6f39b35814902c8c239c0176d23805d1ee40e781f\",\"content_sha256\":\"8d72e2854074bbea237182fe76a2a1b5a2247ebff0288e3540253b30ca716e36\",\"file_bytes\":1690,\"body_bytes\":572},{\"atom_id\":\"make-the-step-halt-where-the-menu-is\",\"file_sha256\":\"1252829855643e3285ee0c3cbd41cb351e7dfa61b99a78dd44d0e630bdf768ae\",\"content_sha256\":\"76d4f99b943ccd543c20a6ab1bdffb2c2038ec4ca93d7d51a821ada9c7610814\",\"file_bytes\":1469,\"body_bytes\":435},{\"atom_id\":\"never-write-a-skip-instruction-into-a-workflow\",\"file_sha256\":\"092bb0eeea7fabda62a9c40e5ca45b08b8fff9013664796dcd11dfa7d09b56ed\",\"content_sha256\":\"639b4aed80aa9520b2ca90e870efb8e0a026ecc2cc9bb5c85120855f3bea6b76\",\"file_bytes\":1612,\"body_bytes\":502},{\"atom_id\":\"resolve-every-placeholder-to-a-defined-source\",\"file_sha256\":\"034c2e5e6cd32cb1e0168d64a4610a093826a0de625a7b182af0ffa7901b345b\",\"content_sha256\":\"287959cca5b705f5ceb7abc59fd51c5f6e852816c421c42d9530708738b26274\",\"file_bytes\":1650,\"body_bytes\":585},{\"atom_id\":\"write-the-path-inline-instead-of-through-a-variable\",\"file_sha256\":\"7ef142572ac862e000d8df6093f1dd233eaca589c48a60ff3e3852a653864f82\",\"content_sha256\":\"d3d9a48c70559df99dacf9e7483e5aecefedd04f78c728b3e25c9111d939caaf\",\"file_bytes\":1547,\"body_bytes\":464}]"
carrier_sha256: b091ceb8723f6cc56d8251834664869bed3cf0a6b508bd3c1b9216514eed87fd
carrier_bytes: 14525
revision: 1
status: active
---
<!-- vpmodule:atom:begin anchor-a-path-outside-the-unit-to-a-configured-root -->
---
instruction_id: anchor-a-path-outside-the-unit-to-a-configured-root
title: Anchor a path outside the unit to a configured root
summary: "A path that leaves the unit is anchored to a configured root, never to an absolute or home-relative path."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file refers to a file or a script that lies outside the unit.
conditions_does_not_apply_when: The reference stays inside the unit.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the referenced target
  - the root it is anchored to
  - the forms that are refused
artifact_contract_verified_by: "no absolute, home-relative or bare outside path survives in the unit"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Anchor a path outside the unit to a configured root
References to files outside the skill directory must use `{project-root}/...` or a config-derived path (e.g., `{output_folder}/...`).
A skill runs its own scripts through `{skill-root}`.
Flag absolute paths, home-relative paths (`~/`), or bare paths that resolve outside the skill.
Replace with `{project-root}/...` or the appropriate config value.
<!-- vpmodule:atom:end anchor-a-path-outside-the-unit-to-a-configured-root -->
<!-- vpmodule:atom:begin anchor-an-internal-reference-to-the-file-that-holds-it -->
---
instruction_id: anchor-an-internal-reference-to-the-file-that-holds-it
title: Anchor an internal reference to the file that holds it
summary: "A reference from one file of a unit to another file of the same unit is relative, and resolved from the directory of the file that holds it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file points at another file of the same unit.
conditions_does_not_apply_when: The reference points outside the unit or at a file that carries no path.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the referenced file
  - the form of the reference
  - the file that holds it
artifact_contract_verified_by: every internal reference resolves from the directory of the file that holds it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Anchor an internal reference to the file that holds it
Any reference from one file in the skill to another file in the same skill must be a relative path resolved from the directory of the originating file.
Use `./` prefix for siblings or children, `../` for parent traversal.
Bare relative filenames in markdown links (e.g., `[text](sibling.md)`) are also acceptable.
<!-- vpmodule:atom:end anchor-an-internal-reference-to-the-file-that-holds-it -->
<!-- vpmodule:atom:begin invoke-the-other-unit-instead-of-reaching-into-its-files -->
---
instruction_id: invoke-the-other-unit-instead-of-reaching-into-its-files
title: Invoke the other unit instead of reaching into its files
summary: Another unit is invoked by name in prose; a file inside another unit is never referenced by path.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file needs another unit or a resource that another unit owns.
conditions_does_not_apply_when: The resource belongs to this unit or to a location outside both units.
artifact_contract_output_type: invocation-rule
artifact_contract_required_data:
  - the unit to invoke
  - the wording used
  - where a shared resource goes instead
artifact_contract_verified_by: no path crosses into another unit and every cross-unit reference says invoke
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/insert-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone/steps/project-md-milestone-write.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Invoke the other unit instead of reaching into its files
A skill must never reference a file inside another skill's directory by path.
A skill's files are private to it, and a path into another skill breaks when that skill is moved or reorganized.
When a skill references another skill by name in prose, the surrounding instruction must use the word "invoke".
The canonical form is ``Invoke the `skill-name` skill``.
Phrases like "Read fully and follow", "Execute", "Run", "Load", "Open", or "Follow" are invalid — they imply file-level operations on a document, not skill invocation.

A record that has an owner is updated through that owner, never by editing the file behind its back - the owner may guard the file.
A shared record is written by one owner: a scoped context must not write it, because the last writer would silently win.
<!-- vpmodule:atom:end invoke-the-other-unit-instead-of-reaching-into-its-files -->
<!-- vpmodule:atom:begin keep-the-rendering-machine-out-of-the-template -->
---
instruction_id: keep-the-rendering-machine-out-of-the-template
title: Keep the rendering machine out of the template
summary: A template that becomes a committed artefact carries no value baked in by the machine that renders it.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A template produces an artefact that is committed and used elsewhere.
conditions_does_not_apply_when: The file is the artefact itself and is not reused as a template.
artifact_contract_output_type: template-rule
artifact_contract_required_data:
  - the render-time expression
  - the form the consumer receives
  - the form the template keeps
artifact_contract_verified_by: the produced artefact carries no value from the rendering machine
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the rendering machine out of the template
Template files become artifacts (for example plan files) that are committed and used on other machines.
The distinction between `{{name}}` and `{{ config.name }}` matters: the first is an artifact placeholder the consumer of the generated document fills in later; the second is a value baked in at render time.
Remove the expression.
Use single-curly `{var}` if the value should be resolved at runtime by the consumer of the generated artifact, or plain double-curly `{{var}}` if it is a placeholder the consumer fills in.
<!-- vpmodule:atom:end keep-the-rendering-machine-out-of-the-template -->
<!-- vpmodule:atom:begin make-the-step-halt-where-the-menu-is -->
---
instruction_id: make-the-step-halt-where-the-menu-is
title: Make the step halt where the menu is
summary: A step that offers a menu says in the same section that it stops and waits for the answer.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A step of a workflow presents a menu of choices to the user.
conditions_does_not_apply_when: The step runs unattended and offers no choice.
artifact_contract_output_type: step-rule
artifact_contract_required_data:
  - the menu
  - the halt statement in the same section
  - what the step waits for
artifact_contract_verified_by: the section that holds the menu also holds the halt and the wait
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Make the step halt where the menu is
Any step that presents a user menu (e.g., `[C] Continue`, `[A] Approve`, `[S] Split`) must explicitly HALT and wait for user response before proceeding.
Find menu patterns (bracketed letter options).
Check that text within the same section (under the same heading) includes "HALT", "wait", "stop", "FORBIDDEN to proceed", or equivalent.
Add an explicit HALT instruction before or after the menu.
<!-- vpmodule:atom:end make-the-step-halt-where-the-menu-is -->
<!-- vpmodule:atom:begin never-write-a-skip-instruction-into-a-workflow -->
---
instruction_id: never-write-a-skip-instruction-into-a-workflow
title: Never write a skip instruction into a workflow
summary: A workflow file never tells the agent to skip a step or to reorder the sequence; conditional routing stays allowed.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A workflow file is written or reviewed.
conditions_does_not_apply_when: The text is an enforcement instruction that forbids skipping.
artifact_contract_output_type: workflow-rule
artifact_contract_required_data:
  - the wording that was refused
  - the conditional routing that stays
  - the enforcement wording that is kept
artifact_contract_verified_by: no file carries a skip instruction and the sequence stays mandatory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Never write a skip instruction into a workflow
No file should instruct the agent to skip steps or optimize step order.
Sequential execution is mandatory.
Scan for phrases like "skip to step", "jump to step", "skip ahead", "optimize the order", "you may skip".
Exclude negation context (e.g., "do NOT skip steps", "NEVER skip") — these are enforcement instructions, not skip instructions.
Conditional routing (e.g., "if X, go to step N; otherwise step M") is valid workflow branching, not skipping.
<!-- vpmodule:atom:end never-write-a-skip-instruction-into-a-workflow -->
<!-- vpmodule:atom:begin resolve-every-placeholder-to-a-defined-source -->
---
instruction_id: resolve-every-placeholder-to-a-defined-source
title: Resolve every placeholder to a defined source
summary: "Every token in an instruction resolves to a declared value, a configured key, a runtime value or a path anchor."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file carries tokens that the agent is expected to fill in.
conditions_does_not_apply_when: The file carries no token.
artifact_contract_output_type: token-rule
artifact_contract_required_data:
  - the token
  - the source it resolves to
  - the placeholder that is left for the consumer
artifact_contract_verified_by: no token is left without a source it resolves to
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Resolve every placeholder to a defined source
- `{name}` — a frontmatter variable in the same file, a config key, a runtime variable set during execution, or the path anchors `{project-root}` and `{skill-root}`.
- Plain double-curly `{{name}}` with **no** `config.` or `workflow.` prefix — an artifact placeholder that survives rendering into the generated document, to be filled in by whoever consumes it (e.g. `{{story_key}}` in a story template).
Every token must resolve to a defined source, per the Token Forms table above:
Flag any token that cannot be traced to a source.
<!-- vpmodule:atom:end resolve-every-placeholder-to-a-defined-source -->
<!-- vpmodule:atom:begin write-the-path-inline-instead-of-through-a-variable -->
---
instruction_id: write-the-path-inline-instead-of-through-a-variable
title: Write the path inline instead of through a variable
summary: "A path to a file of the same unit is written inline where it is used, never held in a variable."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file refers to a file that belongs to the same unit.
conditions_does_not_apply_when: The path points outside the unit and is anchored to a configured root.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the path
  - where it is written
  - the exception when one applies
artifact_contract_verified_by: no variable holds a path to a file of the same unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write the path inline instead of through a variable
Variables must not store paths to files within the same skill.
These paths should be hardcoded as relative paths inline where used.
This applies to YAML frontmatter variables AND markdown body variable assignments (e.g., `` `template` = `./template.md` `` under a `### Paths` section).
If a path variable is used in 4+ locations across multiple files and the path is non-trivial, a variable MAY be acceptable.
<!-- vpmodule:atom:end write-the-path-inline-instead-of-through-a-variable -->