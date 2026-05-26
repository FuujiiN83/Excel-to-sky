# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This directory is **not a software project** — it is a workspace for managing agent skills via the `npx skills` CLI (the package manager for the open agent skills ecosystem at https://skills.sh/). There is no application source, build system, or test suite. Do not invent one.

## Layout

- `skills-lock.json` — lockfile pinning installed skills to a `source` (e.g. `vercel-labs/skills`), `skillPath` inside that source, and a `computedHash`. Treat this as the source of truth for what is installed.
- `.agents/skills/<name>/SKILL.md` — installed skill definitions. These are universal-format skills symlinked into Claude Code; they run with full agent permissions.

Currently installed: `find-skills` (vercel-labs/skills) and `grill-me` (mattpocock/skills).

## Common commands

All work in this repo is done through the `skills` CLI:

```bash
npx skills find [query]                  # search the ecosystem
npx skills add <owner/repo> --skill <name>   # install a specific skill
npx skills add <owner/repo@skill> -g -y      # install globally, non-interactive
npx skills check                         # check for updates
npx skills update                        # update installed skills
```

When the user asks "is there a skill for X" or wants to extend capabilities, invoke the installed `find-skills` skill rather than searching ad-hoc.

## Working rules (mandatory)

- **Antes de cualquier tarea nueva, comprobar si ya existe una skill para ello.** Invocar la skill `find-skills` (instalada en `.agents/skills/find-skills`) y/o `npx skills find <query>` antes de improvisar una solución. Si hay skill, usarla; si no, proceder con capacidades generales.
- **Hablar de forma directa, escueta, sin rodeos y al grano.** Sin preámbulos, sin resumir lo ya dicho, sin relleno. Frases cortas. Respuestas mínimas viables.
- **Cada acción, respuesta o pregunta debe incluir el contexto mínimo necesario para entender qué se está haciendo y por qué.** No asumir que el usuario recuerda el comando o el objetivo: nombrar la skill/comando/archivo concreto y la finalidad en una línea.

## Behaviors specific to this repo

- **Verify before recommending an install.** Per the `find-skills` SKILL.md: prefer skills with 1K+ installs, official sources (`vercel-labs`, `anthropics`, `microsoft`), and check the source repo's stars. Be skeptical of anything under 100 installs.
- **Review the security risk assessment** printed by `npx skills add` (Gen / Socket / Snyk). Surface Medium/High risk results to the user before they rely on the skill.
- **Skills run with full agent permissions.** Read a freshly-installed `SKILL.md` before invoking it.
- The `skills-lock.json` `computedHash` detects drift — if a skill file is edited locally, it will no longer match. Don't hand-edit installed `SKILL.md` files; reinstall or fork instead.
