---
instruction_id: handle-implementer-report
title: Розбирай звіт виконавця за станом
summary: "Відповідай на кожен стан звіту своєю дією: завершення, застереження, брак контексту або блокування."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: Виконавець повернув звіт про задачу.
conditions_does_not_apply_when: Задача ще виконується і звіту немає.
artifact_contract_output_type: implementer-report-handling
artifact_contract_required_data:
  - стан звіту
  - застереження
  - наступна дія
artifact_contract_verified_by: every report status has a recorded response
compatibility_excludes: []
compatibility_requires:
  - delegate-subagent-work
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/implementer-prompt.md
status: active
revision: 2
---

# Розбирай звіт виконавця за станом
Прочитай звіт повністю перед наступним кроком.
Для завершеного звіту перевір зміни й переходь до перегляду.
Для звіту із застереженнями прочитай їх до перегляду.
Якщо застереження стосуються правильності чи обсягу, виправ їх.
Якщо потрібен контекст, надай його й повтори доручення.
Якщо задачу заблоковано, з'ясуй причину.
Для браку контексту повтори з тим самим виконавцем.
Для браку здатності підвищ рівень виконавця.
Для завеликої задачі розбий її на менші.
Не ігноруй повідомлення про блокування.
Не змушуй того самого виконавця повторити без змін.
Не вважай звіт доказом результату.
Не переходь до перегляду без повного звіту.
Якщо задачу доручено за delegate-subagent-work, повідом про блокування тому, хто її доручив.
Відповідай на запитання виконавця до початку роботи.
Запиши, який стан звіту отримано.
