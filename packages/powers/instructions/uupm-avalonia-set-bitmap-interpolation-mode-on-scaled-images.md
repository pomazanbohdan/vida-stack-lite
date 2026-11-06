---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-set-bitmap-interpolation-mode-on-scaled-images
title: "Set bitmap interpolation mode on scaled images"
summary: "RenderOptions.BitmapInterpolationMode controls image scaling quality vs cost; default may look aliased on upscaled or downscaled bitmaps"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L25"
status: active
revision: 1
---

# Set bitmap interpolation mode on scaled images

RenderOptions.BitmapInterpolationMode controls image scaling quality vs cost; default may look aliased on upscaled or downscaled bitmaps

**Do:** RenderOptions.SetBitmapInterpolationMode tuned to the use case

**Don't:** Default interpolation on scaled images that look blurry or aliased

**Applies To:** avalonia 12

**Severity:** Low

**Good example:**

```text
RenderOptions.SetBitmapInterpolationMode(image, BitmapInterpolationMode.HighQuality);
```

**Bad example:**

```text
Image scaled with Stretch and no interpolation hint set
```
