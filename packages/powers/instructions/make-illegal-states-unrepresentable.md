---
instruction_id: make-illegal-states-unrepresentable
title: Зроби незаконні стани невиразними
summary: "Перенеси правила допустимих значень у тип і конструктор, щоб незаконний стан не можна було створити."
capability_tags:
  - make-states-unrepresentable
pattern_tags:
  - state-modeling
conditions_applies_when: "Об'єкт має кілька взаємозалежних полів або прапорців, чиї комбінації бувають неможливими."
conditions_does_not_apply_when: Дані надходять із зовнішнього джерела й перевіряються лише на межі входу.
artifact_contract_output_type: constrained-type
artifact_contract_required_data:
  - перелік законних станів
  - тип
  - єдиний конструктор
  - тест на незаконний стан
artifact_contract_verified_by: "the project's type checks and a test that fails to build an illegal state"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-type-system-discipline/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/typescript-best-practices/references/patterns.md
status: active
revision: 1
---

# Зроби незаконні стани невиразними
Переліч стани, у яких об'єкт може перебувати законно.
Знайди поля, чиї комбінації описують неможливий стан.
Заміни набір незалежних полів на тип, що допускає лише законні варіанти.
Вирази кожен стан окремим варіантом із власними даними.
Перенеси перевірку з місця використання в місце створення.
Зроби конструктор єдиним входом у стан, що потребує перевірки.
Прибери прапорці, які лише дублюють інформацію з варіанта.
Заборонь значення, що означають «невідомо» й «порожньо» одночасно.
Використай тип для обмеження діапазону, формату або дозволеного набору.
Перевір, що код не може створити об'єкт в обхід перевірки.
Зроби неможливий перехід помилкою компіляції, а не винятком у рантаймі.
Додай тест, який намагається побудувати незаконний стан і не компілюється або падає.
Переглянь місця, де тип розширюють через приведення.
Залиш один спосіб подати кожен факт.
Перевір, що повідомлення про помилку називає порушене правило.
Віддай тип, у якому незаконний стан не має представлення.
