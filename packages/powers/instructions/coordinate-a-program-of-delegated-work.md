---
instruction_id: coordinate-a-program-of-delegated-work
title: Керуй програмою делегованої роботи
summary: Розбий велику роботу на частини з власником і залежностями та зводь їх у погодженому порядку.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Робота більша за одну зміну й потребує кількох виконавців або послідовних етапів.
conditions_does_not_apply_when: Задача вкладається в одну зміну й одного виконавця.
artifact_contract_output_type: program-plan
artifact_contract_required_data:
  - частини
  - залежності
  - власники
  - точки зведення
  - стан
artifact_contract_verified_by: each part checked at its merge point before the next starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/orchestrate.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autopilot-full.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/swarm/SKILL.md
status: active
revision: 1
---

# Керуй програмою делегованої роботи
Розбий програму на частини з власним результатом.
Визнач залежності й те, що можна робити паралельно.
Признач одного власника на кожну частину.
Дай кожному виконавцю бриф і межі його файлів.
Зафіксуй, як частини зійдуться в один результат.
Перевіряй завершену частину до запуску наступної.
Тримай чергу готових до перевірки робіт короткою.
Фіксуй, які частини можна почати, не чекаючи інших.
Попереджай виконавця, якщо його частина змінилася.
Звіряй фактичний прогрес із планом щонайменше раз на цикл.
Не запускай дві частини, що змінюють той самий файл.
Оновлюй план, коли частина виявила нову залежність.
Зупиняй роботу, що вийшла за межі свого результату.
Запиши стан кожної частини й наступний крок.
Віддай зведення: що готово, що в роботі, що заблоковано.
