---
instruction_id: keep-one-writer-per-branch
title: Тримай одного письменника на гілку
summary: "Призначай єдиного власника запису для кожної гілки й передавай її явно, щоб паралельна робота не зіштовхувалася."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - program-orchestration
conditions_applies_when: Кілька виконавців працюють паралельно й можуть торкнутися тієї самої гілки.
conditions_does_not_apply_when: Робота виконується послідовно одним виконавцем.
artifact_contract_output_type: branch-ownership
artifact_contract_required_data:
  - гілки
  - поточний власник
  - порядок злиття
  - передача
artifact_contract_verified_by: a branch listing showing one owner per branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autopilot-stack.md
status: active
revision: 1
---

# Тримай одного письменника на гілку
Визнач, хто єдиний змінює кожну гілку в поточний момент.
Не давай двом виконавцям писати в ту саму гілку.
Розведи паралельну роботу по окремих гілках або теках.
Познач файли, які не можна змінювати паралельно.
Дай кожному виконавцю окрему теку для тимчасових файлів.
Перевір, що після передачі ніхто не тримає стару копію відкритою.
Запиши, які гілки залежать від однієї спільної зміни.
Признач порядок злиття залежних гілок.
Оновлюй гілку перед передачею її наступному власнику.
Перевір, що в гілці немає чужих незакомічених змін.
Зафіксуй, хто й коли передав володіння.
Не змушуй наступного власника розбирати чужі конфлікти.
Зупини паралельну роботу, якщо гілки перетнулися.
Віддай список гілок із поточним власником.
