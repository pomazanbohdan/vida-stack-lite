---
instruction_id: pressure-test-guidance
title: Перевіряй настанову під тиском
summary: "Запускай настанову в сценарії з обмеженнями, неоднозначністю й конфліктними стимулами та закривай знайдені обходи."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Настанова має утримувати поведінку під тиском, а не лише описувати процес."
conditions_does_not_apply_when: "Настанова є довідкою без правил, які можна порушити."
artifact_contract_output_type: pressure-test
artifact_contract_required_data:
  - сценарій
  - тиск
  - вибір виконавця
  - виправлення
artifact_contract_verified_by: guidance holds under a pressured scenario
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/examples/CLAUDE_MD_TESTING.md
status: active
revision: 2
---

# Перевіряй настанову під тиском
Створи сценарій із реальною задачею.
Додай обмеження часу або ресурсу.
Додай неоднозначність у вимогах.
Додай конфліктний стимул: швидкість проти якості.
Запусти сценарій із настановою.
Зафіксуй дію, яку виконавець обрав під тиском.
Порівняй вибір із потрібним.
Знайди обхід або виправдання.
Виправ формулювання настанови.
Повтори той самий сценарій.
Додай новий тиск, якщо обхід зник.
Не вважай один успішний запуск доказом.
Не змінюй сценарій під час перевірки.
Запиши результати до і після.
Зупини перевірку, коли нові обходи не з'являються.
