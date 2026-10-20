---
instruction_id: set-guidance-specificity
title: Задавай потрібний рівень свободи настанови
summary: "Обирай між точним рецептом і загальним принципом за тим, наскільки крихкий результат."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Треба вирішити, наскільки детально описувати дію."
conditions_does_not_apply_when: Правило вже має єдину допустиму форму.
artifact_contract_output_type: guidance-specificity
artifact_contract_required_data:
  - крихкість результату
  - рівень свободи
  - межа
artifact_contract_verified_by: outcome stable within the stated freedom
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
status: active
revision: 1
---

# Задавай потрібний рівень свободи настанови
Визнач, наскільки крихкий потрібний результат.
Для крихкої операції дай точну послідовність.
Для задачі з багатьма допустимими рішеннями дай принцип і межі.
Для задачі з вибором виконавця дай критерії, а не рецепт.
Назви, що саме залишаєш на розсуд виконавця.
Не давай точний рецепт там, де потрібне судження.
Не давай загальний принцип там, де помилка неприпустима.
Перевір, що рівень свободи відповідає ціні помилки.
Перевір, що виконавець може діяти без здогадів.
Звузь свободу, якщо результат став нестабільним.
Розшир свободу, якщо рецепт заважає доречному рішенню.
Не змішуй точність із надмірною деталізацією.
Не залишай межу свободи неявною.
Запиши межу свободи в настанові.
Перевір результат на кількох випадках.
