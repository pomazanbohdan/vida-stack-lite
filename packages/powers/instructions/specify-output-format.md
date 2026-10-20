---
instruction_id: specify-output-format
title: Задавай формат результату за потрібною строгістю
summary: "Обирай між точним і гнучким шаблоном за вимогами споживача й задавай розділи, поля та приклад форми."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Результат має бути придатним для подальшого читання або обробки.
conditions_does_not_apply_when: Форма результату не впливає на його придатність.
artifact_contract_output_type: output-contract
artifact_contract_required_data:
  - рівень строгості
  - шаблон
  - "обов'язкові поля"
  - приклад форми
artifact_contract_verified_by: result matches the chosen strictness level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 2
---

# Задавай формат результату за потрібною строгістю
Визнач, чи впливає форма результату на його придатність.
Обери рівень строгості за вимогами того, хто читатиме результат.
Для строгих вимог задай точний шаблон і вимагай його дотримання.
Для гнучких вимог задай розумний типовий шаблон і дозволь відхилення.
Назви обов'язкові розділи для обраного рівня.
Покажи короткий приклад потрібної форми.
Для строгого шаблону зафіксуй порядок розділів.
Для гнучкого шаблону дозволь змінювати розділи під характер задачі.
Вкажи, які поля обов'язкові, а які можна додати за потреби.
Прив'яжи вибір рівня до споживача результату.
Не змішуй формат із змістом.
Не описуй форму лише словами, якщо можна показати.
Перевір результат на відповідність обраному рівню.
Познач відхилення від строгого шаблону.
Онови шаблон після зміни вимог.
Збережи шаблон разом із результатом.
