---
instruction_id: curate-trusted-resources
title: Curate trusted resources
summary: "Keep a curated set of high-trust sources, annotated with what each covers and when to reach for it, grouped by knowledge and wisdom, and pruned ruthlessly."
capability_tags:
  - teach-with-workspace
pattern_tags:
  - teaching-workspace
conditions_applies_when: Knowledge for teaching must be grounded in trusted sources.
conditions_does_not_apply_when: The topic has no trustworthy sources.
artifact_contract_output_type: resource-list
artifact_contract_required_data:
  - annotated sources
  - knowledge group
  - wisdom group
  - gaps
artifact_contract_verified_by: every entry names what it covers and when to use it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/teach/RESOURCES-FORMAT.md
status: active
revision: 1
---

# Curate trusted resources
The resources list is the curated set of trusted sources for this topic. Knowledge for explainers should be drawn from here, not from parametric guesses. Wisdom comes from the communities listed here.
- **High-trust only.** Prefer primary sources, recognised experts, peer-reviewed work, and communities with strong moderation. If a resource is marketing dressed as education, leave it out.
- **Annotate every entry.** A bare link is useless in three months. Add one line: what it covers and when to reach for it.
- **Group by Knowledge / Wisdom.** Mirrors the philosophy. It is fine for a resource to appear in only one group.
- **Surface gaps explicitly.** If no good resource exists for an area the mission needs, write a `## Gaps` section listing what is missing. This drives future search.
- **Prune ruthlessly.** A resource that turned out to be wrong, shallow, or off-mission should be removed, not buried. Better five sharp sources than thirty mediocre ones.
- **Record community preferences.** If the user has opted out of joining communities, note it here so future sessions don't keep proposing them.
