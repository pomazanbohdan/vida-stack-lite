---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-handle-file-uploads-with-withfileuploads
title: "Handle file uploads with WithFileUploads"
summary: "Livewire's trait manages chunked upload and temp storage"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Livewire guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L17"
status: active
revision: 1
---

# Handle file uploads with WithFileUploads

Livewire's trait manages chunked upload and temp storage

**Do:** WithFileUploads trait + wire:model for file inputs

**Don't:** Manual multipart form submissions for Livewire pages

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
use WithFileUploads; public $photo; <input wire:model="photo" type="file">
```

**Bad example:**

```text
<form action="/upload" method="POST" enctype="multipart/form-data">
```
