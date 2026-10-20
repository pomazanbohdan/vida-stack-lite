---
instruction_id: enforce-plan-completion-contract
title: Завершуй задачу лише за повним доказом
summary: "Вважай задачу виконаною тільки тоді, коли всі її тести запущені, прочитані й порівняні з очікуваннями."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Ти збираєшся позначити задачу плану завершеною.
conditions_does_not_apply_when: Задача ще виконується або не має визначеного критерію завершення.
artifact_contract_output_type: task-completion-evidence
artifact_contract_required_data:
  - повний набір тестів
  - вивід
  - порівняння з очікуванням
artifact_contract_verified_by: full task test run passes and output is read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
status: active
revision: 1
---

# Завершуй задачу лише за повним доказом
Перед завершенням задачі перевір наявність усіх її тестів.
Якщо тест не існує, створи його до завершення.
Запусти повний набір тестів задачі.
Прочитай вивід, а не лише код завершення.
Порівняй кожен очікуваний результат із фактичним.
Перевір, що кожне відхилення має запис у журналі.
Вважай невдалий запуск незавершеною задачею.
Не записуй завершення після часткового запуску.
Не перенось результат попереднього запуску на змінений код.
Запиши діапазон змін, команду й результат.
Не закривай задачу з відкритим блокером.
Не закривай задачу з неперевіреним припущенням.
Якщо тест падає з іншої причини, не підмінюй його іншим.
Не вважай зелений файл зеленим набором.
Переходь далі лише після виконання всіх умов.
