---
instruction_id: clean-up-integration-workspace
title: Прибирай лише своє робоче середовище
summary: "Видаляй робоче дерево лише після успішної інтеграції, лише власне й лише без втрати унікальних файлів."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Інтеграцію завершено або власник підтвердив видалення роботи.
conditions_does_not_apply_when: "Роботу залишено для перегляду, доопрацювання або відкладеного рішення."
artifact_contract_output_type: workspace-cleanup
artifact_contract_required_data:
  - власник середовища
  - стан файлів
  - виконане очищення
artifact_contract_verified_by: no unique files removed without explicit choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 1
---

# Прибирай лише своє робоче середовище
Визнач, чи середовище створене для цієї роботи.
Залиш середовище, якщо роботу опубліковано для перегляду.
Залиш середовище, якщо власник обрав відкласти інтеграцію.
Перевір наявність незакомічених і унікальних файлів.
Не видаляй середовище з унікальними файлами.
Не застосовуй примусове видалення без прямої вказівки.
Покажи власнику список файлів, які зникнуть.
Запропонуй закомітити, перенести або видалити їх.
Виконуй видалення лише ззовні робочого дерева.
Не видаляй чужі або невідомі робочі дерева.
Не вважай відмову видалення приводом для примусу.
Не очищай середовище, поки перегляд має відкриті блокери.
Перевір стан після очищення.
Збережи шлях до середовища, якщо його залишено.
Повідом, що саме прибрано й що залишено.
