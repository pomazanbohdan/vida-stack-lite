---
instruction_id: cite-evidence-lines
title: Підкріплюй кожну знахідку місцем доказу
summary: "Кожне твердження в аналізі має посилання на файл і рядок; числа беруться з артефакту, а не з пам'яті."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Ти формулюєш знахідку або висновок про виконаний артефакт.
conditions_does_not_apply_when: Ти лише описуєш метод аналізу без тверджень.
artifact_contract_output_type: cited-finding
artifact_contract_required_data:
  - файл і рядок
  - цитата
  - впевненість
artifact_contract_verified_by: "every finding has a path:line citation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/analyst-common.md
status: active
revision: 1
---

# Підкріплюй кожну знахідку місцем доказу
Для кожної знахідки вкажи файл і рядок.
Додай коротку цитату з місця доказу.
Вкажи діапазон кроків, до якого належить знахідка.
Познач рівень упевненості.
Бери числа лише з артефакту або виконаної команди.
Не переноси число з пам'яті.
Не додавай знахідку без посилання.
Відкидай знахідку, яку не можеш підкріпити.
Не цитуй більше, ніж потрібно для доказу.
Не приховуй, що доказ неповний.
Не використовуй переказ джерела замість цитати.
Не змішуй спостереження з інтерпретацією.
Запиши, що саме перевірено.
Познач знахідки з низькою впевненістю.
Не роби висновків поза межами доказу.
Заверши, коли кожна знахідка має місце доказу й рівень упевненості.
