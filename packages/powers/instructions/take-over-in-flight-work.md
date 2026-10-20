---
instruction_id: take-over-in-flight-work
title: "Переймай роботу, що вже триває"
summary: "Звір описаний стан із фактичним і продовжуй із найменшої наступної дії, не переписуючи чужі рішення."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "Ти починаєш із незавершеної роботи, залишеної іншим виконавцем або попереднім запуском."
conditions_does_not_apply_when: Робота починається з чистого стану.
artifact_contract_output_type: takeover-record
artifact_contract_required_data:
  - фактичний стан
  - ухвалені рішення
  - точка зупинки
  - наступний крок
artifact_contract_verified_by: existing checks run before any edit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/ketchup/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/session-pickup.md
status: active
revision: 1
---

# Переймай роботу, що вже триває
Прочитай записку про стан і поточні зміни.
Перевір, що описаний стан збігається з фактичним.
Запусти наявні перевірки, перш ніж щось змінювати.
З'ясуй, які рішення вже ухвалені й чому.
Знайди місце, де робота зупинилася.
Перевір, чи не залишилося фонових процесів від попереднього запуску.
Познач обмеження, які діяли для попереднього виконавця.
Не змінюй формат звіту, який уже використовує команда.
Зафіксуй, що саме ти перевірив особисто.
Підтверди наступний крок із тим, хто передав роботу.
Не переписуй чужі зміни без причини.
Онови записку, якщо стан розійшовся з описом.
Продовж із найменшої наступної дії.
Віддай підтвердження, що роботу прийнято, і план продовження.
