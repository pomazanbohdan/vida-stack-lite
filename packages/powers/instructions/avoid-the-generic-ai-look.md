---
instruction_id: avoid-the-generic-ai-look
title: Avoid the generic AI look
summary: "Use the product's own palette, spacing and content instead of the defaults a generated interface falls into."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A user interface is being built or reviewed and could fall into the generated look.
conditions_does_not_apply_when: "The product's own design system already defines the visual language."
artifact_contract_output_type: aesthetic-decision
artifact_contract_required_data:
  - the defaults avoided
  - the product value used instead
artifact_contract_verified_by: "no listed default appears in the result and every choice comes from the product's own system"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Avoid the generic AI look

AI-generated UI has recognizable patterns. Avoid all of them:

| AI Default | Why It Is a Problem | Production Quality |
|---|---|---|
| Purple/indigo everything | Models default to visually "safe" palettes, making every app look identical | Use the project's actual color palette |
| Excessive gradients | Gradients add visual noise and clash with most design systems | Flat or subtle gradients matching the design system |
| Rounded everything (rounded-2xl) | Maximum rounding signals "friendly" but ignores the hierarchy of corner radii in real designs | Consistent border-radius from the design system |
| Generic hero sections | Template-driven layout with no connection to the actual content or user need | Content-first layouts |
| Lorem ipsum-style copy | Placeholder text hides layout problems that real content reveals (length, wrapping, overflow) | Realistic placeholder content |
| Oversized padding everywhere | Equal generous padding destroys visual hierarchy and wastes screen space | Consistent spacing scale |
| Stock card grids | Uniform grids are a layout shortcut that ignores information priority and scanning patterns | Purpose-driven layouts |
| Shadow-heavy design | Layered shadows add depth that competes with content and slows rendering on low-end devices | Subtle or no shadows unless the design system specifies |

"The AI aesthetic is fine for now" | It signals low quality. Use the project's actual design system from the start.

Generic "AI look" (purple gradients, oversized cards, stock layouts)
