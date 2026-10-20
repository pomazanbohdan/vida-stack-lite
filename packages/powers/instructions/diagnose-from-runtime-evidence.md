---
instruction_id: diagnose-from-runtime-evidence
title: Діагностуй за даними середовища виконання
summary: "Відновлюй перебіг події за журналами, метриками й трасуванням, а не за здогадами про код."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - systematic-debugging
conditions_applies_when: Дефект виникає лише в реальному середовищі й не відтворюється локально.
conditions_does_not_apply_when: Причину видно з коду або з простого локального відтворення.
artifact_contract_output_type: runtime-diagnosis
artifact_contract_required_data:
  - часова лінія
  - перша точка відхилення
  - версія й конфігурація
  - відкинуті гіпотези
artifact_contract_verified_by: correlated logs and traces for the same request
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/runtime-forensics.md
status: active
revision: 1
---

# Діагностуй за даними середовища виконання
Збери журнали, метрики й трасування за той самий проміжок часу.
Прив'яжи кожен запис до конкретного запиту або користувача.
Порівняй успішні й невдалі випадки.
Знайди першу точку, де поведінка відхилилася від очікуваної.
Перевір версію, конфігурацію й дані на момент події.
Відтвори умови локально, якщо це можливо.
Перевір, чи не змінився обсяг даних між успішним і невдалим випадком.
Порівняй поведінку до і після останнього розгортання.
Зафіксуй запит, який відтворює проблему, у вигляді команди.
Познач, які дані довелося приховати під час збору.
Не роби висновок із одного запису.
Запиши, які гіпотези відкинуто й чим.
Відділи причину від супутніх симптомів.
Віддай діагноз із часовою лінією й доказами.
