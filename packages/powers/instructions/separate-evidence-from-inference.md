---
instruction_id: separate-evidence-from-inference
title: Відділяй доказ від висновку
summary: "Позначай кожне твердження як факт, висновок чи припущення й додавай ланцюг від джерела."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Ти подаєш дослідження або діагноз, на який спиратиметься рішення."
conditions_does_not_apply_when: Відповідь очевидна й не містить висновків поза межами спостереженого.
artifact_contract_output_type: evidence-map
artifact_contract_required_data:
  - твердження
  - тип
  - джерело
  - впевненість
  - спростування
artifact_contract_verified_by: every fact traced to a cited location in the sources
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/epistemics.md
status: active
revision: 1
---

# Відділяй доказ від висновку
Познач кожне твердження як факт, висновок або припущення.
До кожного факту додай джерело й місце.
До кожного висновку додай ланцюг від фактів.
Познач, які факти отримані з одного джерела.
Назви альтернативне пояснення тих самих фактів.
Відкинь висновок, який не витримує альтернативного пояснення.
Збережи цитати короткими й точними.
Назви, яке спостереження змінило б висновок.
Відкинь твердження, що спирається лише на авторитет.
Відрізняй кореляцію від причини.
Перевір, чи джерела не походять одне від одного.
Запиши рівень впевненості для кожного висновку.
Не подавай припущення як встановлений факт.
Віддай твердження з доказами й окремим списком припущень.
