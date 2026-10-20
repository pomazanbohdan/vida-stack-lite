---
instruction_id: analyze-guidance-timeline
title: Будуй хронологію застосованих настанов
summary: Зістав запити власника з викликами настанов і знайди пропущені або пізні спрацювання.
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Скарга стосується настанови, яка не спрацювала або спрацювала пізно."
conditions_does_not_apply_when: Артефакт не містить викликів настанов.
artifact_contract_output_type: guidance-timeline
artifact_contract_required_data:
  - запити
  - виклики
  - пропуски
  - сторонні інструменти
artifact_contract_verified_by: each request matched against guidance triggers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/skill-timeline.md
status: active
revision: 2
---

# Будуй хронологію застосованих настанов
Переліч запити власника з місцем і часом.
Знайди кожен виклик настанови.
Запиши назву настанови й крок, у якому її застосовано.
Переліч інші інструменти й розширення, які використовувалися.
Порівняй текст запиту з умовами застосування настанов.
Знайди запит, що відповідає умовам, але не викликав настанову.
Знайди пізній виклик.
Познач сторонні інструменти з місцем.
Не оцінюй, чи пропуск був помилкою.
Не вигадуй умову застосування заднім числом.
Не змішуй виклик настанови зі згадкою в тексті.
Відділяй явний виклик від автоматичного.
Познач непідтверджені виклики.
Запиши, які запити й виклики перевірено.
Не роби висновок про причину пропуску.
Заверши, коли кожен запит зіставлено з викликом настанови.
