---
instruction_id: run-bounded-fix-loop
title: "Обмежуй цикл виправлень п'ятьма раундами"
summary: "Виправляй знахідки раундами, повертайся до того самого виконавця перші три раунди й замінюй його далі."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Перегляд повернув підтверджену знахідку, яку треба виправити."
conditions_does_not_apply_when: Знахідок немає або вони вже закриті доказом.
artifact_contract_output_type: fix-loop
artifact_contract_required_data:
  - відкриті знахідки
  - раунд
  - повторний перегляд
  - рішення
artifact_contract_verified_by: scoped re-review of each fix round
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/re-review-prompt.md
status: active
revision: 1
---

# Обмежуй цикл виправлень п'ятьма раундами
Почни цикл лише з підтвердженою знахідкою.
Залишай дрібні знахідки поза циклом і записуй їх.
Передавай виконавцю відкриті знахідки дослівно.
У раундах з першого по третій повертайся до того самого виконавця.
З четвертого раунду залучай нового виконавця з вищим рівнем.
Кожен раунд завершуй повторним переглядом лише діапазону виправлення.
Вимагай від виконавця тести, команду й вивід.
Не приймай виправлення без повторного перегляду.
Не розширюй повторний перегляд на незмінений код.
Не виправляй знахідки сам замість виконавця.
Після п'ятого раунду ухвали рішення щодо кожної відкритої знахідки.
Записуй кожне рішення в журнал.
Не відкидай знахідку мовчки.
Зупини цикл, якщо виправлення вимагає нового рішення про архітектуру.
Повідом, які знахідки залишилися відкритими.
