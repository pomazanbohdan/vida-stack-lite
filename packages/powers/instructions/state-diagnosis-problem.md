---
instruction_id: state-diagnosis-problem
title: Сформулюй проблему до аналізу
summary: "Домовся про одне твердження: що очікували, що сталося і який показник важливий."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Треба з'ясувати, чому робота виконавця пішла не так."
conditions_does_not_apply_when: Проблема вже сформульована як конкретна подія з межами.
artifact_contract_output_type: problem-statement
artifact_contract_required_data:
  - очікування
  - факт
  - показник
  - межі
artifact_contract_verified_by: owner confirms the statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 1
---

# Сформулюй проблему до аналізу
Постав одне запитання за раз.
З'ясуй, які артефакти або випадки стосуються проблеми.
Назви діапазон кроків, якщо він відомий.
Зафіксуй очікувану поведінку.
Зафіксуй фактичну поведінку.
Назви показник: час, обсяг, повторні дії або конкретна подія.
Відрізняй скаргу від твердження про проблему.
Не починай аналіз до згоди щодо твердження.
Не реконструюй твердження за власника.
Не додавай у твердження причину.
Не звужуй проблему до зручної частини.
Запиши твердження в робочий файл.
Познач, чи потрібен звіт для передачі назовні.
Повтори твердження власнику.
Зупини аналіз, якщо твердження лишається нечітким.
