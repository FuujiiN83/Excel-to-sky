# Architecture Decision Records (ADRs)

This directory records the project-wide decisions that are easy to forget the _why_ of three months later. We use the lightweight format from Michael Nygard's [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): one Markdown file per decision, sequentially numbered, with four fixed sections (**Status**, **Context**, **Decision**, **Consequences**).

## Index

| #                                           | Title                                                              | Status   |
| ------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [0001](./0001-no-llm.md)                    | No LLM in the analysis path                                        | Accepted |
| [0002](./0002-supabase-only-for-sharing.md) | Supabase is the _only_ server-side component, and only for sharing | Accepted |
| [0003](./0003-web-workers-for-cpu.md)       | Web Workers for parsing and analysis                               | Accepted |

## When to write a new ADR

Write one whenever you are about to make a decision that:

- changes a non-obvious project-wide invariant (privacy guarantee, data path, build pipeline)
- reverses or supersedes a previous ADR
- you would otherwise have to re-explain to every new contributor

You do _not_ need an ADR for routine refactors, individual component choices, or library upgrades that don't change the project's posture. When in doubt, ask in the PR.

## Conventions

- File name: `NNNN-kebab-case-title.md`, with `NNNN` zero-padded to four digits.
- Status starts as **Proposed**, becomes **Accepted** when the PR merges, and may later become **Superseded by NNNN** or **Deprecated**.
- Never edit an Accepted ADR's _Decision_ section in place — add a new ADR that supersedes it, and update the index. Editing Status, fixing typos, or appending clarifications is fine.
- Link the ADR from the relevant PR description and, ideally, from the code that implements it.
