---
instruction_id: redesign-as-if-foundational
title: "Перепроєктуй так, ніби основа вільна"
summary: "Спроєктуй рішення без історичних обмежень, порівняй із поточним станом і зроби найменший крок у бік цілі."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Поточний стан накопичив обмеження, які заважають рухатися далі."
conditions_does_not_apply_when: Зміна локальна й не потребує перегляду основи.
artifact_contract_output_type: target-design
artifact_contract_required_data:
  - цільовий стан
  - історичні обмеження
  - різниця
  - перший крок
artifact_contract_verified_by: "the first step validated against the project's checks"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-redesign-from-first-principles/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-foundational-thinking/SKILL.md
status: active
revision: 1
---

# Перепроєктуй так, ніби основа вільна
Відклади наявну реалізацію й опиши задачу з нуля.
Назви обмеження, які справді походять від продукту.
Відділи обмеження, що існують лише через історію коду.
Спроєктуй рішення без цих історичних обмежень.
Порівняй його з поточним станом.
Познач, які частини поточного рішення вже відповідають цільовому.
Оціни, чи можна дійти до цілі без переписування.
Відкинь цільовий елемент, який не дає користі користувачу.
Знайди різницю, яка дає найбільшу користь.
Оціни ціну переходу до нового стану.
Вибери найменший крок у бік нового проєкту.
Запиши, що залишиться від старого рішення й чому.
Не переписуй усе одразу.
Віддай опис цільового стану й перший крок до нього.
