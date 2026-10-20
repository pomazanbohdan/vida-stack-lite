---
instruction_id: triage-incoming-reports
title: Розбирай вхідні звіти за єдиним маршрутом
summary: "Відділяй спостережуваний факт від припущення, класифікуй звіт і призначай маршрут за класом."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: "Надійшов звіт про дефект, запит або питання, який треба спрямувати далі."
conditions_does_not_apply_when: Звіт уже класифікований і має призначеного виконавця.
artifact_contract_output_type: report-triage
artifact_contract_required_data:
  - факт
  - припущення
  - клас
  - маршрут
  - наступний крок
artifact_contract_verified_by: a reproduction attempt or an explicit note that it is impossible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/FOR_AGENTS.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/triage-issue-reports/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/triage-issue-reports/references/routing.example.md
status: active
revision: 1
---

# Розбирай вхідні звіти за єдиним маршрутом
Прочитай звіт і відділи спостережуваний факт від припущення автора.
Перевір, чи описано кроки відтворення й очікуваний результат.
Знайди, якої інформації бракує для рішення.
Перевір, чи звіт стосується поточної версії продукту.
Відділи звіти, які потребують даних від автора.
Познач звіт, який дублює інший, і вкажи оригінал.
Зафіксуй, хто відповідає за наступний крок.
Класифікуй звіт: дефект, запит, питання, дублікат, поза обсягом.
Перевір наявні звіти перед створенням нового.
Признач маршрут за класом, а не за гучністю звіту.
Познач звіт, який неможливо відтворити, і попроси конкретні дані.
Не обіцяй виправлення до підтвердження причини.
Запиши рішення й підставу в самому звіті.
Віддай список звітів із класом, маршрутом і наступним кроком.
