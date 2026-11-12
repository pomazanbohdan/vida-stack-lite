---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-accessibility-checklist-md-24e2df84-c01"
title: "addy-skills: references/accessibility-checklist.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:references/accessibility-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/accessibility-checklist.md\"}"
atom_ids:
  - announce-dynamic-changes-to-assistive-technology
  - declare-the-page-structure-and-content
  - label-every-field-and-attach-its-error
  - make-every-control-keyboard-operable
  - meet-the-visual-and-touch-minimums
  - name-every-control-for-assistive-technology
  - never-use-colour-as-the-only-signal
  - verify-accessibility-with-an-audit-and-a-keyboard-pass
atom_count: 8
atoms: "[{\"atom_id\":\"announce-dynamic-changes-to-assistive-technology\",\"file_sha256\":\"de068beeb9b0e99bd207626007ec017bd784d443e2a50bb1e2417ebe8ad933d2\",\"content_sha256\":\"887526ae7739050755f0fb5382e860e2f143016d75035fe96b14a3435446ee93\",\"file_bytes\":1710,\"body_bytes\":556},{\"atom_id\":\"declare-the-page-structure-and-content\",\"file_sha256\":\"1db65fc3e7cefaf58871c49d09fe0597892eb314765922950a67d6feda5da1f9\",\"content_sha256\":\"b2967989c79545b82b1ea810a9f2d682e1e4d59d59489414cf4db82f61440100\",\"file_bytes\":1395,\"body_bytes\":246},{\"atom_id\":\"label-every-field-and-attach-its-error\",\"file_sha256\":\"e388cd093d37f8f30feb97259ec9ab091bf750e1cef0a265ad95df81846260f3\",\"content_sha256\":\"f1e48da59cdb81870cc2f0f11f72f2932f6c6a76758262a7b6b182111079af71\",\"file_bytes\":1362,\"body_bytes\":255},{\"atom_id\":\"make-every-control-keyboard-operable\",\"file_sha256\":\"5979a048eec1e466effe01cfd5add7c837e37f9ca38f6395129c7a1b1f783de5\",\"content_sha256\":\"942e0f9860736f502d5eeb5208ab0231ea1b558c2e01ac4c44d51e3ca9dbf04c\",\"file_bytes\":1754,\"body_bytes\":611},{\"atom_id\":\"meet-the-visual-and-touch-minimums\",\"file_sha256\":\"aca8de5690e5e277725cc5af1492331d513323935f5301f757b9da4bb8b7bbc2\",\"content_sha256\":\"dd2ee355ea4d4c0be1c30d9712032f461caa92b79226d0310d9f7460848eb5ab\",\"file_bytes\":1292,\"body_bytes\":292},{\"atom_id\":\"name-every-control-for-assistive-technology\",\"file_sha256\":\"d59861673bb75f187bae648462a3362c5a9500e32312bd91da2878ca88b86292\",\"content_sha256\":\"bbc1f853d3cddb72485764fd44c9eb3d4d26519827cd5e38704186ac6a09f3e6\",\"file_bytes\":1841,\"body_bytes\":702},{\"atom_id\":\"never-use-colour-as-the-only-signal\",\"file_sha256\":\"1fde78f460d18867793c0908b1859b26fb28d86919916c81f7658544dccbad48\",\"content_sha256\":\"4cdd2c099a94b3cf5ddfe6bc1f637a3787eae24ecf1d8e89988d63d5dfa855c5\",\"file_bytes\":1399,\"body_bytes\":336},{\"atom_id\":\"verify-accessibility-with-an-audit-and-a-keyboard-pass\",\"file_sha256\":\"49afa6c1f7711910bb0edfd8ceb98faed6ae676ae253b442ea05f4847b908668\",\"content_sha256\":\"31903ad81c6f12d48c3f94c78a29b39a3f7df80363b8bcef663d8a2349597593\",\"file_bytes\":1646,\"body_bytes\":445}]"
carrier_sha256: 0e5375f1e36b2d140fdbad8f3c040f9f90ad04343a61da011b64632c9d8eaf63
carrier_bytes: 13514
revision: 1
status: active
---
<!-- vpmodule:atom:begin announce-dynamic-changes-to-assistive-technology -->
---
instruction_id: announce-dynamic-changes-to-assistive-technology
title: Announce dynamic changes to assistive technology
summary: "Content that changes after the page loads is announced, either politely at the next pause or immediately for errors."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "Content appears, changes or finishes loading without a page reload."
conditions_does_not_apply_when: The surface never changes after it loads.
artifact_contract_output_type: dynamic-change-announcement-review
artifact_contract_required_data:
  - the dynamic change
  - the live region that carries it
  - the politeness level
artifact_contract_verified_by: every dynamic change reaches a live region with the politeness level that matches its urgency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Announce dynamic changes to assistive technology
Dynamic content changes announced (`aria-live` regions)
`aria-live="polite"` | Announced at next pause | Status updates, saved confirmations
`aria-live="assertive"` | Announced immediately | Errors, time-sensitive alerts
`role="status"` | Same as `polite` | Status messages
`role="alert"` | Same as `assertive` | Error messages
<!-- Loading states -->
<div aria-busy="true" aria-label="Loading tasks">
  <Spinner />
</div>
Autoplaying media | Disorienting, can't be stopped | Add controls, don't autoplay
<!-- vpmodule:atom:end announce-dynamic-changes-to-assistive-technology -->
<!-- vpmodule:atom:begin declare-the-page-structure-and-content -->
---
instruction_id: declare-the-page-structure-and-content
title: Declare the page structure and content
summary: "The page declares its language, its title, its heading order and its table headers, and never presents a blank surface."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A page or view is built or reviewed.
conditions_does_not_apply_when: "The work does not produce a document with headings, tables or a language."
artifact_contract_output_type: page-structure-review
artifact_contract_required_data:
  - the declared language
  - the heading order
  - the header cells of every table
artifact_contract_verified_by: "the page declares its language, has one top heading with no skipped levels, and every table has scoped header cells"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Declare the page structure and content
Language declared (`<html lang="en">`)
Page has a descriptive `<title>`
Page has one `<h1>` and headings don't skip levels
Tables have `<th>` headers with scope
Meaningful empty states (not blank screens)
<!-- vpmodule:atom:end declare-the-page-structure-and-content -->
<!-- vpmodule:atom:begin label-every-field-and-attach-its-error -->
---
instruction_id: label-every-field-and-attach-its-error
title: Label every field and attach its error
summary: "Every field carries a visible label, and every error names the field it belongs to and is reachable by focus."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A form is built or reviewed.
conditions_does_not_apply_when: The work builds no form.
artifact_contract_output_type: form-error-review
artifact_contract_required_data:
  - the field
  - its visible label
  - the error attached to it
  - how a failed submission is summarised
artifact_contract_verified_by: "every field has a visible label and every error is tied to its field, with the submission summary focusable"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Label every field and attach its error
Every input has a visible label
Known fields use autocomplete (for example `type="email" autocomplete="email"`)
Error messages specific and associated with the field
Form submission errors summarized and focusable
<!-- vpmodule:atom:end label-every-field-and-attach-its-error -->
<!-- vpmodule:atom:begin make-every-control-keyboard-operable -->
---
instruction_id: make-every-control-keyboard-operable
title: Make every control keyboard-operable
summary: "Every interactive element must be reachable and operable from the keyboard, in a visible and logical focus order."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: An interface with interactive elements is built or reviewed.
conditions_does_not_apply_when: The surface has no interactive element.
artifact_contract_output_type: keyboard-operability-checklist
artifact_contract_required_data:
  - the interactive elements
  - how each one is reached and operated
  - the focus order
artifact_contract_verified_by: "every interactive element is reachable and operable by keyboard alone, with the focus always visible"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Make every control keyboard-operable
All interactive elements focusable via Tab key
Focus order follows visual/logical order
Focus is visible (outline/ring on focused elements)
Custom widgets have keyboard support (Enter to activate, Escape to close)
No keyboard traps (user can always Tab away from a component)
Skip-to-content link at top of page - visible (at least) on keyboard focus
Modals trap focus while open, return focus on close
Removing focus outlines | Users can't see where they are | Style outlines, don't remove them
`tabindex` > 0 | Breaks natural tab order | Use `tabindex="0"` or `-1` only
<!-- vpmodule:atom:end make-every-control-keyboard-operable -->
<!-- vpmodule:atom:begin meet-the-visual-and-touch-minimums -->
---
instruction_id: meet-the-visual-and-touch-minimums
title: Meet the visual and touch minimums
summary: "Contrast, text scaling, flashing and hit areas stay inside the stated minimums."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A visual interface is built or reviewed.
conditions_does_not_apply_when: The work produces no visual surface.
artifact_contract_output_type: visual-threshold-report
artifact_contract_required_data:
  - the measured contrast ratios
  - the text scaling result
  - the hit-area sizes
artifact_contract_verified_by: every measured value is inside the stated minimum
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Meet the visual and touch minimums
Text contrast ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, 18px+)
UI components contrast ≥ 3:1 against background
Text resizable to 200% without breaking layout
No content that flashes more than 3 times per second
Touch targets ≥ 44x44px on mobile
<!-- vpmodule:atom:end meet-the-visual-and-touch-minimums -->
<!-- vpmodule:atom:begin name-every-control-for-assistive-technology -->
---
instruction_id: name-every-control-for-assistive-technology
title: Name every control for assistive technology
summary: "Give every control an accessible name and the right role, so that assistive technology announces what the control is."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "An interface renders images, form fields, buttons, links or custom widgets."
conditions_does_not_apply_when: The surface renders no interactive or descriptive element.
artifact_contract_output_type: accessible-name-review
artifact_contract_required_data:
  - the element
  - its accessible name
  - its role
artifact_contract_verified_by: every control has a name that says what it does and an element that matches its behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - engineering
---

# Name every control for assistive technology
All images have `alt` text (or `alt=""` for decorative images)
All form inputs have associated labels (`<label>` or `aria-label`)
Buttons and links have descriptive text (not "Click here")
Icon-only buttons have `aria-label`
Use `<button>` for actions
Use `<a>` for navigation
NEVER use div/span as buttons
`div` as button | Not focusable, no keyboard support | Use `<button>`
Missing `alt` text | Images invisible to screen readers | Add descriptive `alt`
Custom dropdown with no ARIA | Unusable by keyboard/screen reader | Use native `<select>` or proper ARIA listbox
Empty links/buttons | "Link" announced with no description | Add text or `aria-label`
<!-- vpmodule:atom:end name-every-control-for-assistive-technology -->
<!-- vpmodule:atom:begin never-use-colour-as-the-only-signal -->
---
instruction_id: never-use-colour-as-the-only-signal
title: Never use colour as the only signal
summary: "Every state that is carried by colour is carried by text, an icon or another cue as well."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "A state, a link, a required field or an error is shown with colour."
conditions_does_not_apply_when: Nothing in the surface is distinguished by colour.
artifact_contract_output_type: non-colour-signal-review
artifact_contract_required_data:
  - the state
  - the colour cue
  - the cue that survives without colour
artifact_contract_verified_by: "every colour-only state also carries a text, icon or pattern cue"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Never use colour as the only signal
Color is not the only way to convey information
Links distinguish from surrounding text (not by color alone)
Required fields indicated (not by color alone)
Error state visible by more than color (icon, text, border)
Color-only states | Invisible to color-blind users | Add icons, text, or patterns
<!-- vpmodule:atom:end never-use-colour-as-the-only-signal -->
<!-- vpmodule:atom:begin verify-accessibility-with-an-audit-and-a-keyboard-pass -->
---
instruction_id: verify-accessibility-with-an-audit-and-a-keyboard-pass
title: Verify accessibility with an audit and a keyboard pass
summary: "Accessibility is checked with an automated audit, with the browser's own accessibility view and with a screen reader, not by reading the code."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: An interface is about to be called accessible or is about to ship.
conditions_does_not_apply_when: The change touches no user-visible surface.
artifact_contract_output_type: accessibility-verification-record
artifact_contract_required_data:
  - the automated audit result
  - the accessibility tree inspection
  - the screen reader pass
artifact_contract_verified_by: "the audit, the tree and the screen reader pass have all been run against the current build"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Verify accessibility with an audit and a keyboard pass
Quick reference for WCAG 2.1 AA compliance.
# Automated audit
npx axe-core          # Programmatic accessibility testing
npx pa11y             # CLI accessibility checker
# In browser
# Chrome DevTools → Lighthouse → Accessibility
# Chrome DevTools → Elements → Accessibility tree
# Screen reader testing
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (free) or JAWS
# Linux: Orca
<!-- vpmodule:atom:end verify-accessibility-with-an-audit-and-a-keyboard-pass -->