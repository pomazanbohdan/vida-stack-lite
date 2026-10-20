---
instruction_id: scrub-and-gate-artifact-sharing
title: Очищай артефакт і відкривай доступ лише після згоди
summary: "Перед передаванням артефакту заміни чутливі значення, перевір очищення окремим проходом і дочекайся явної згоди."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: "Артефакт треба передати, опублікувати або показати поза місцем створення."
conditions_does_not_apply_when: Артефакт не залишає місце створення і не містить чутливих значень.
artifact_contract_output_type: scrubbed-artifact
artifact_contract_required_data:
  - перелік файлів
  - таблиця замін
  - журнал очищення
  - згода
artifact_contract_verified_by: independent scrub audit returns clean
compatibility_excludes: []
compatibility_requires:
  - protect-sensitive-artifacts
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/scrub.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/scrub-audit.md
status: active
revision: 3
---

# Очищай артефакт і відкривай доступ лише після згоди
Визнач, які файли входять до копії.
Категорії заміни бери з protect-sensitive-artifacts.
Замінюй чутливі значення під час копіювання.
Веди єдину таблицю відповідності значень плейсхолдерам.
Зберігай структуру, потрібну для перевірки знахідок.
Познач кожну заміну в цитатах.
Не записуй чутливе значення в журнал очищення.
Перевір копію окремим проходом.
Поверни чисто лише за відсутності пропусків.
Інакше поверни перелік пропусків без чутливих значень.
Не виправляй пропуски під час перевірки.
Покажи власнику журнал і перелік файлів.
Дочекайся явної згоди на передавання.
Не передавай копію до перевірки.
Заверши, коли копія пройшла перевірку й отримала згоду.
