---
description: In-depth PR review — run the change in its real runtime, file follow-up issues, post a structured verdict
argument-hint: <PR number> [--post | --dry-run]
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

Conduct an in-depth review of PR **$1** on this repository.

Additional flags passed: $2 (`--post` = publish the review and file the issues; `--dry-run` or absent = produce everything but publish nothing, and ask before any outward-facing action).

## Method

Work through these phases in order. Do not skip to the write-up.

### Phase 1 — Understand the change

`gh pr view $1` and `gh pr diff $1`. Read every changed file **in its full surrounding context**, not just the hunks. For each change, decide: is this the feature, a drive-by fix, or scope creep? Drive-by fixes that look unrelated are often the most important part of the PR — verify whether they are load-bearing before calling them out as scope creep.

### Phase 2 — Establish the baseline

Check the branch out locally. Run the project's own gates: build, lint, test. Record counts. Check `gh pr checks $1`. A green CI answers "does it compile and pass existing tests" and nothing else.

### Phase 3 — Run it in the real target runtime

**This is the phase that produces the findings.** A review that never executed the change is a code reading.

If the change targets a runtime other than the one the tests run in — an edge runtime, a container, a different Node major, a browser, a device — exercise it there. Scaffold the artifact the change produces, install it, build it, start it, send real traffic at it. Compare behaviour against the runtime the test suite uses.

Probe deliberately for divergence: status codes with special semantics, duplicate keys, binary payloads, empty bodies, malformed input, headers that legitimately repeat, error paths, and anything the change's own tests assert. When the two runtimes disagree, determine **which one is right** before writing it up.

### Phase 4 — Root-cause before enumerating

Group findings by cause, not by symptom. If several defects share one origin, say it once and treat the origin as the finding. Decide what the correct architecture is, independent of how long it would take to build.

### Phase 5 — File follow-up issues **before** writing the review

Anything structural, pre-existing, or larger than this PR becomes its own issue with a full reproduction and acceptance criteria, so it stands alone without the PR as context. Match the repo's existing issue title and label conventions (`gh label list`, `gh issue list`). File an umbrella/RFC issue for the root cause and cross-link the rest to it. Resolve the cross-references after creation so no placeholders ship.

### Phase 6 — Write and publish

Use the structure below. Then, if `--post`: `gh pr review $1 --comment --body-file <path>` (or `--request-changes` only if explicitly asked). Otherwise present the draft and ask.

## Output structure

Fixed sections, always this order. Omit one only if genuinely empty, and say "Nothing found" rather than deleting the heading — a missing section reads as "not checked".

> Severity legend: **[BLOCK]** required before merge · **[SHOULD]** wanted in this PR, negotiable · **[TRACK]** accepted as a follow-up issue · **[NIT]** polish

**0. Verdict** — 2–3 sentences. State merge posture and publish posture _separately_; they are different decisions. Say plainly whether regressions exist. Lead with the answer.

**1. Verification performed** — a table of what was actually **run**, not read: build/lint/test with counts, CI status, and the feature exercised in its real target runtime. Follow with a short "what I want to single out as correct" paragraph crediting the non-obvious good work, with evidence. This is what makes the critical sections land as collaboration rather than gatekeeping.

**2. [BLOCK] Required before merge** — numbered §2.x so §8 can reference them. Each: symptom → reproduction/evidence → why it matters → the specific ask. Paste real output rather than describing it. Where the ask is _documentation_ rather than code, say so — it keeps the blocking list small and achievable.

**3. [SHOULD] Wanted in this PR** — small, contained, verified. Explicitly mark anything that is pre-existing debt rather than the contributor's doing, and offer the escape hatch ("folded into #NNN if you'd rather not").

**4. [SHOULD] Architectural note** — the section that stops the review being a pile of patches. Name the single root cause the defects share, name the correct destination, and state the optimisation target out loud: we are not buying the cheapest patch. Tell the contributor before they invest in shims, not after.

**5. [TRACK] Follow-up issues opened** — table of issue → scope. Then invite the contributor to pick some up: suggest an order, explain why those first, and give an explicit no-obligation out.

**6. [NIT] Minor** — flat bullets, no ceremony. Include stale docs and comments in files the PR already touches.

**7. Security & supply chain** — state what was _specifically checked_: injection, prototype pollution, exec/eval/network, dependency and lockfile deltas, secret and error-detail leakage. "Clean" is only credible with the list behind it.

**8. Requested actions** — checkbox list referencing the §-numbers. Mark optional items `*(optional)*`. Close with the merge condition as one sentence.

## Rules

1. **Run it, don't read it.** Most real findings come from the running system, not the diff.
2. **Test both runtimes when they differ.** Bugs a test suite _hides_ and bugs it _invents_ are equally disqualifying, and only a two-runtime run finds either.
3. **Separate regression from pre-existing debt now exposed.** Different owners, different urgency. Conflating them is unfair to the contributor.
4. **Merge-safe ≠ publish-safe.** Answer both.
5. **Root-cause before enumerating.** Five findings with one cause is one finding.
6. **Every blocking item gets a reproduction.** If it can't be reproduced, it isn't blocking.
7. **Cost is not the deciding input.** Choose the architecture that is correct at scale, then sequence it. Do not dilute it to fit a sprint.
8. **File the issues first, link them second.** A follow-up mentioned but not filed is a follow-up that never happens.
9. **Leave the tree as you found it.** Restore the original branch, remove probe files and scratch scaffolds, and report anything you couldn't clean up.
10. **Credit precisely.** Name the specific thing the contributor got right and why it was hard. Generic praise reads as padding.
