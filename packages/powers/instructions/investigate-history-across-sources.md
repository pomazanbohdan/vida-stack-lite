---
instruction_id: investigate-history-across-sources
title: Досліджуй історію з кількох джерел
summary: "Відновлюй причину рішення за історією змін, обговореннями й записами, порівнюючи джерела між собою."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Треба зрозуміти, чому код, структура або рішення мають саме такий вигляд."
conditions_does_not_apply_when: "Питання стосується поточної поведінки, яку можна прочитати з коду."
artifact_contract_output_type: history-finding
artifact_contract_required_data:
  - питання
  - джерела
  - хронологія
  - розбіжності
  - межі впевненості
artifact_contract_verified_by: each claim linked to a dated source record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/figure-it-out/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/trace-forensics.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/source-playbook.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/code-archaeology.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/databricks.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/datadog.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/incident-postmortem.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/linear.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/notion.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/sentry.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/why/references/sources/slack.md
status: active
revision: 1
---

# Досліджуй історію з кількох джерел
Сформулюй питання про те, чому код або рішення виглядають саме так.
Переглянь історію змін, пов'язані обговорення й записи рішень.
Знайди автора або власника, який може підтвердити контекст.
Порівняй версії одного й того самого рішення в різних джерелах.
Познач розбіжності й час, коли вони з'явилися.
Перевір, чи джерело не є переказом іншого джерела.
Відділи рішення, які стосуються коду, від рішень про продукт.
Познач, які питання залишилися без відповіді.
Спитай власника, якщо джерела суперечать одне одному.
Відділяй намір від того, що вийшло насправді.
Перевір, чи причина ще діє.
Не вважай найстаріше джерело істиною.
Запиши хронологію з посиланнями.
Віддай відповідь про причину з межами впевненості.
