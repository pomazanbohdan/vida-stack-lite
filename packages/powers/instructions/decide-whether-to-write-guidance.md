---
instruction_id: decide-whether-to-write-guidance
title: "Вирішуй, чи варто взагалі писати настанову"
summary: "Пиши настанову лише для повторюваної, неочевидної практики, а не для одноразового рішення."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Ти вирішуєш, чи створювати нову настанову."
conditions_does_not_apply_when: Настанова вже існує і її треба лише змінити.
artifact_contract_output_type: guidance-decision
artifact_contract_required_data:
  - повторюваність
  - переносність
  - користь
  - рішення
artifact_contract_verified_by: reuse case exists beyond one task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 1
---

# Вирішуй, чи варто взагалі писати настанову
Перевір, чи проблема повторюється в різних задачах.
Перевір, чи рішення не є очевидним із загальних практик.
Перевір, чи практика переносна між проєктами.
Перевір, чи інші виконавці отримають користь.
Не пиши настанову для одноразового рішення.
Не пиши для загальновідомої практики.
Не пиши для проєктної домовленості, яку веде конфігурація.
Не пиши для правила, яке можна перевірити автоматично.
Для механічного правила зроби перевірку.
Для проєктної домовленості онови конфігурацію.
Запиши причину рішення.
Повідом, якщо настанова не потрібна.
Перевір рішення після першого застосування.
Не створюй настанову про запас.
Зупини роботу, якщо користь не доведена.
