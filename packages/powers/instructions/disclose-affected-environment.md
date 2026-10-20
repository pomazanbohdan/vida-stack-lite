---
instruction_id: disclose-affected-environment
title: Розкривай середовище й уражені версії
summary: "Кожен звіт про збій називає продукт, версії, середовище й джерело кожного значення."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Звіт або діагностика описує збій, який залежить від середовища."
conditions_does_not_apply_when: Збій відтворюється незалежно від середовища й версій.
artifact_contract_output_type: environment-disclosure
artifact_contract_required_data:
  - продукт
  - версія
  - середовище
  - джерело значення
artifact_contract_verified_by: every environment field has a source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/issue.md
status: active
revision: 1
---

# Розкривай середовище й уражені версії
Назви продукт і його версію.
Назви операційну систему й оболонку.
Назви середовище виконання та його версію.
Назви використані моделі, якщо вони впливають.
Переліч встановлені розширення й залежності.
Познач джерело кожного поля.
Відрізняй історичне значення від поточного.
Познач невідомі поля як невідомі.
Не перетворюй відсутнє значення на нуль.
Не приховуй версію, на якій відтворено збій.
Не додавай поля без впливу на відтворення.
Повтори середовище в описі випадку.
Онови значення після зміни середовища.
Покажи перелік перед поданням.
Познач, що середовище не вдалося підтвердити.
