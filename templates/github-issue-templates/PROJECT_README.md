# Expressots Project

Unified GitHub Project for ExpressoTS framework work across in-scope repositories.

## In-scope repositories

`expressots`, `expressots-cli`, `adapter-express`, `shared`, `jwt`, `prisma-provider`, `bull-queue`, `expressots-studio`, `expressots-vscode-ext`, `expresso-site-doc`, `expressots-doc`, `templates`, `expressots-project-template`, `expressots-provider-template`, `examples`

## Views

| View | Layout | Filter |
|------|--------|--------|
| Delivery Board | board | `-work type:"Community Idea"` |
| Community Ideas | board | `label:community-idea` |
| Triage Inbox | table | `label:"needs triage"` |
| By Component | board | (all items) |
| Documentation | table | `component:Doc` |
| Roadmap by Release | roadmap | `has:"Target Release"` |

Set grouping in the UI where needed: Delivery Board by **Status**, By Component by **Component**, Roadmap by Release by **Target Release**.

## Automations

**Project workflows (UI):** Item closed → Done, PR merged → Done (already enabled).

**Repo workflows:** `.github/workflows/sync-to-expressots-project.yml` in each in-scope repo auto-adds issues and maps labels to Work Type, Idea Status, Component, and Status.

Re-deploy with `scripts/sync-project-workflow.sh`.

## Issue templates

Canonical templates live in `templates/github-issue-templates/` and are synced via `scripts/sync-issue-templates.sh`.
