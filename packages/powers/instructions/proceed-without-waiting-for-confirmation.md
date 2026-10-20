---
instruction_id: proceed-without-waiting-for-confirmation
title: Продовжуй без очікування підтвердження
summary: "Виконуй уже погоджену роботу, обираючи найбезпечнішу оборотну інтерпретацію, і зупиняйся лише на незворотному."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
  - approval-policy
conditions_applies_when: "Напрям уже погоджений, а неоднозначність стосується деталі виконання."
conditions_does_not_apply_when: "Рішення продуктове, незворотне або вимагає дозволу власника."
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - неоднозначність
  - обрана інтерпретація
  - підстава
  - межа зупинки
artifact_contract_verified_by: "the chosen interpretation still passes the project's checks"
compatibility_excludes: []
compatibility_requires:
  - size-and-gate-the-work
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-never-block-on-the-human/SKILL.md
status: active
revision: 2
---

# Продовжуй без очікування підтвердження
Налаштування користувача вирішує, яка з двох політик погодження активна: ця чи `size-and-gate-the-work`.
Якщо активною обрано `size-and-gate-the-work`, виконуй її замість цієї інструкції й не вигадуй третьої поведінки.
Відрізняй рішення, яке належить власнику, від виконання вже погодженого.
Продовжуй роботу, не питаючи дозволу на кожен дрібний крок.
Обирай найбезпечнішу оборотну інтерпретацію неоднозначності.
Запиши, яку інтерпретацію обрав і чому.
Дай людині шанс зупинити роботу, якщо інтерпретація хибна.
Не використовуй автономність як привід обійти перевірки.
Повідом про зупинку одразу, а не після довгого циклу.
Зупиняйся лише там, де наслідки незворотні або рішення продуктове.
Формулюй питання разом із варіантами й наслідками.
Не вигадуй дозвіл, якого ніхто не давав.
Повідом про прийняте рішення, коли воно вже діє.
Віддай результат разом зі списком власних рішень.
