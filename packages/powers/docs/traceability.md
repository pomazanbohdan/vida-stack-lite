---
type: Traceability Matrix
title: Vida Powers — матриця простеження
description: 'Звʼязок між параграфами research-документа, бізнес-вимогами, системною специфікацією та критеріями прийняття.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- traceability
- coverage
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — продуктова концепція та архітектурний baseline
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers — бізнес-вимоги
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — системна специфікація
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — критерії прийняття
- id: catalog-design
  resource: /catalog-design.md
  title: Vida Powers — дизайн каталогу інструкцій
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

## Research → BR → SR → AC

| Research § | BR | SR | AC |
|---|---|---|---|
| §1 призначення, Router, `vp-setup` | BR-01, BR-05, BR-19, BR-20 | SR-22, SR-56, SR-58 | AC-13, AC-25, AC-26 |
| §2 межі VP і Runtime, режими | BR-07 | SR-24, SR-52, SR-62 | AC-14 |
| §2.1 гібридні агенти, рольові контракти | BR-01 | SR-23, SR-32 | AC-13 |
| §2.2 рекурсивні підзадачі, делегування | BR-07 | SR-44, SR-48 | AC-22 |
| §2.3 Selective Join, Lifecycle Scope | BR-16 | SR-48, SR-49, SR-50, SR-51 | AC-22 |
| §3 установлення, bootstrap, hooks | BR-20 | SR-56, SR-57, SR-59, SR-60, SR-61 | AC-25, AC-26, AC-27 |
| §4.1 канонізація донорів | BR-02 | SR-06, SR-07, SR-34, SR-35 | AC-01, AC-30 |
| §4.2 два виміри тегів | BR-01 | SR-02, SR-03, SR-04, SR-05 | AC-02, AC-03, AC-04 |
| §4.3 методологія як політика | BR-13 | SR-25, SR-26 | AC-15 |
| §4.4 успадкування, override | BR-14, BR-15 | SR-27, SR-28, SR-29 | AC-15, AC-16 |
| §4.5 Live Inheritance, знімок | BR-04, BR-15 | SR-30 | AC-17 |
| §4.6 Risk-Adaptive Updates | BR-04 | SR-15, SR-21 | AC-12 |
| §4.7 операції каталогу | BR-01 | SR-09, SR-10, SR-11, SR-12, SR-13, SR-14 | AC-05, AC-06, AC-07, AC-08 |
| §4.8 два селектори, Decision Provider | BR-01, BR-06 | SR-16, SR-17, SR-18, SR-19, SR-20, SR-21, SR-24 | AC-10, AC-11, AC-12 |
| §4.9 OKF, provenance | BR-02 | SR-07, SR-62, SR-65 | AC-01, AC-09 |
| §5 карта покриття, Light/Medium/Full, ролі | BR-01, BR-06 | SR-31, SR-32 | AC-18 |
| §6 artifact-first, матеріалізація | BR-03, BR-16 | SR-37, SR-38, SR-39, SR-41, SR-42 | AC-20, AC-21 |
| §6.1 три частини матеріалізації | BR-16 | SR-38 | AC-20 |
| §6.2 `artifact_contract` | BR-16 | SR-06, SR-08, SR-41 | AC-20 |
| §7.1–7.6 документний життєвий цикл | BR-04, BR-17, BR-18 | SR-40, SR-42 | AC-20, AC-21 |
| §8.1 власники запису | BR-07 | SR-39, SR-44 | AC-20, AC-22 |
| §8.2 Scope-First | BR-08, BR-10, BR-15 | SR-53, SR-54, SR-55 | AC-23 |
| §8.3–8.4 findings, dedup | BR-11, BR-17 | SR-43, SR-44, SR-45, SR-46, SR-47 | AC-22, AC-24 |
| §9 wiki, work items, ID, relations | BR-16, BR-17 | SR-40 | AC-20 |
| §10 моделі збереження | BR-03, BR-07 | SR-39, SR-42 | AC-20, AC-21 |
| §11 домени, packs | BR-22 | — | поза scope |
| §12 межі автономності, безпека | BR-08, BR-09, BR-10, BR-11, BR-12 | SR-18, SR-19, SR-53, SR-55 | AC-10, AC-23 |
| §13 межі дослідження, наступна робота | BR-23 | — | gap |
| §14 джерела | BR-02 | SR-07 | AC-01 |

**Не нормативні (контекст, а не правила):** §1 «без автоматичного переходу до
нового обсягу роботи» (операційне правило власника, не поведінка VP) і §13
перелік технічно відкритих питань (закривається етапами, а не специфікацією).

## Рішення → SR/AC

| Рішення | Відображено в |
|---|---|
| D1 VP = `packages/powers` | BR-21; реєстрація — Stage 0 |
| D2 монорепозиторій продуктів | BR-21; NFR-06 |
| D3 власний каталог (`.md`-інструкції + `catalog.json`) + розширений реєстр у пакеті агента | SR-01, SR-06, SR-07, SR-15, SR-34, SR-36; AC-01, AC-09, AC-29, AC-30; runtime-запит; дизайн `catalog-design.md` |
| D4 три канали доставки, скіли `vp-mode`/`vp-setup` | BR-19; SR-22, SR-56, SR-58 |
| D4b marketplace-власник, Codex першим | BR-19; AC-27 (обмеження для решти хостів) |
| D5 provider-нейтральний Decision Provider | SR-16, SR-17; AC-10 |
| D6 журнал у bundle | NFR-05; `docs/log.md` |
| D7 ініціалізація за середовищем | BR-20; SR-57, SR-59; AC-25 |
| D8 одна схема профілю, носій за середовищем | SR-33; AC-19 |
| D9 обсяг лише в `packages/powers` | BR-23; реєстрація в root — відкладена залежність |

## Покриття

Кожен параграф research §1–§14 має щонайменше один рядок; нормативні пункти
S-специфікації мають прив'язку до BR і AC. Пункти без AC: SR-15, SR-35, SR-36,
SR-39, SR-45, SR-46, SR-47, SR-58, SR-59, SR-64, SR-65 — вони реалізуються
конфігурацією, схемою або runtime-запитом, а не окремим автотестом; їхня перевірка
закривається воротями відповідного етапу (Stage 2/5/7).

**Відкриті прогалини покриття:** runtime acceptance (AC gap), кваліфікація на
хостах, крім Codex (AC-27, gap), marketplace-інсталяція (gap), правовий висновок
про ліцензії (gap).
