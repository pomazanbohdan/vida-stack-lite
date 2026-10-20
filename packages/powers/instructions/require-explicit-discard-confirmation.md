---
instruction_id: require-explicit-discard-confirmation
title: Вимагай явного підтвердження перед видаленням роботи
summary: Видаляй гілку або робоче дерево лише після прямого прохання власника й точного підтвердження.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Власник просить видалити завершену або відхилену роботу.
conditions_does_not_apply_when: Роботу зберігають або приєднують.
artifact_contract_output_type: discard-confirmation
artifact_contract_required_data:
  - обсяг видалення
  - втрати
  - точне підтвердження
artifact_contract_verified_by: confirmation matches the stated deletion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 1
---

# Вимагай явного підтвердження перед видаленням роботи
Пропонуй видалення лише у відповідь на пряме прохання.
Назви, що саме буде видалено.
Переліч усі зміни, які зникнуть.
Назви шлях робочого дерева.
Попроси ввести точне слово підтвердження.
Дочекайся саме цього підтвердження.
Не вважай згоду або жарт підтвердженням.
Не пропонуй видалення в меню завершення.
Не видаляй роботу, яку ще переглядають.
Збережи копію, якщо власник вагається.
Виконуй видалення лише після підтвердження.
Повідом, що видалено.
Не використовуй примусове видалення без окремої вказівки.
Запиши підтвердження й обсяг видалення.
Зупини дію, якщо підтвердження неточне.
