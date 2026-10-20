---
instruction_id: optimize-guidance-triggers
title: Описуй у настанові умови застосування
summary: "Починай опис із ситуацій, у яких настанова потрібна, і не переказуй у ньому весь процес."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Настанову треба зробити знайденною для потрібної задачі.
conditions_does_not_apply_when: Настанова завжди завантажується разом із задачею.
artifact_contract_output_type: guidance-trigger
artifact_contract_required_data:
  - умова застосування
  - симптоми
  - ключові слова
  - межа
artifact_contract_verified_by: guidance found from a symptom-only request
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
status: active
revision: 1
---

# Описуй у настанові умови застосування
Визнач, за якими ознаками задачу треба віднести до настанови.
Почни опис із умови застосування.
Назви симптоми, ситуації й контексти.
Використовуй слова, які виконавець шукатиме.
Пиши в третій особі.
Не переказуй у описі весь робочий процес.
Не замінюй умову застосування назвою настанови.
Не використовуй абстрактні формулювання без ознак.
Для технологічної настанови назви технологію явно.
Не додавай у опис обіцянку результату.
Не використовуй першу особу.
Перевір, чи знайде виконавець настанову за симптомом.
Перевір, чи не спрацює вона на непотрібній задачі.
Онови опис після зміни змісту.
Збережи опис коротким.
