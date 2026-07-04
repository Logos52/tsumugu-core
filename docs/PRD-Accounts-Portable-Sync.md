---
title: "PRD — Accounts & Portable Sync: the UserDoc as a file you carry"
type: prd
status: draft
created: 2026-07-02
updated: 2026-07-02
audience: Wedge (sign-off) + Claude Code
owns: Identity, word-state sync, the portable UserDoc contract, grammar-known stretch. Umbrella: PRD-Super-App-Unification.md. Reverses PRD-Tsumugu-Core-v1.md §1.3/§4.6 (accounts deferral) on Wedge's 2026-07-02 directive.
authority: Wedge directive 2026-07-02 ("user account where a user can both locally and remotely host a json file representing their known and unknown vocabulary"); app/src/store/{userDoc,userStore,remoteStore}.ts (built, gated)
---

# PRD — Accounts & Portable Sync

**Verdict: the account is a file, never an email. Stage 1 ships with zero backend — the existing `UserDoc` JSON becomes a first-class portable document (download, re-import, paste a sync code, pull from a user-hosted URL), all flowing through the already-built never-demote merge. Stage 2, behind a demand kill-gate, adds one ~300-line Cloudflare Worker + D1 with token identity — no email, no password, no PII, ever.** Magic-link auth (the GROK-BUILD §4.6 recommendation) is rejected: it is the only design on the table that adds PII, a deliverability ops tail, and a subprocessor, and the product does not need it to satisfy the directive.

## 1. The reversal, stated

PRD-Tsumugu-Core-v1.md §1.3: "Accounts / login / identity. No auth. Known-word state is local-only. → Phase 2" and §4.6: "No seed-on-signup, no account-owned state." Wedge's 2026-07-02 directive pulls sync forward. What this PRD does **not** reverse: local remains the source of truth at every stage; the never-demote `"1".."4"|known|ignored` model is finished work and stays untouched; nothing here creates account-*owned* state — the account is a carrying case for state the device owns.

## 2. What already exists (verified in tree)

- `UserDoc@1` (`store/userDoc.ts`, 241 lines): `{schema, userId, updatedAt, profile, settings, store: WordStoreDoc, progress?}` — the exact "JSON file representing known and unknown vocabulary" the directive names.
- `mergeUserDocs(local, server)`: entry-by-entry via engine `resolveStatusUpdate` with `policy: "never-demote"`, `statusUpdatedAt` as the reconciliation clock; tested.
- `RemoteStore { get/put/delete }` seam (`store/remoteStore.ts:9–13`): set `VITE_SYNC_API_URL` → the already-written `FetchRemoteStore` goes live against `GET/PUT/DELETE {base}/store?userId=…`; unset → local-sim. Stage 2 is one env var away by construction.
- Export exists (`accountView.ts:330`: full-UserDoc JSON download); file **import** does not (only a paste-seed textarea). Anki `.apkg` export exists.
- Auth today is a fully simulated magic-link (`auth/session.ts`: "Login does NOT talk network") — deleted from the user path by this PRD, kept in tree.

## 3. Stage 1 — sync is a document you carry ($0, no server)

The gated Account surface becomes a **Sync panel** (Settings moves out to the 設 popover — closes v1-STATUS Review #7). Three channels, one contract; every channel deserializes to a UserDoc and calls the same merge:

1. **File export / import.** Download exists; add the missing half — file-picker/drag import routed through `mergeUserDocs`. Mobile handoff via the Web Share API.
2. **Sync code.** `base64url(deflate(UserDoc))`, copy/paste to restore. Measured on a synthetic 2,500-entry doc: 456 KB raw → ~90 KB deflated → ~120 KB encoded; clipboard handles that trivially. QR does not (v40-L caps at 2,953 bytes) — QR is cut from doc transport and reserved for Stage-2 token pairing, where it fits.
3. **BYO remote URL** — the directive's "remotely host a json file," served immediately: a `UrlRemoteStore implements RemoteStore` that pulls from any user-supplied URL (Gist raw, own host) and merges on load; writes stay manual export. Zero Tsumugu infrastructure.

The panel also carries the already-built **Anki `.apkg` export** — an explicit amendment of PRD v1 §1.3/§8.4, which kept export out of v1 chrome (surfaced on the umbrella's §9.3 sign-off list; the Ulysses "ePub/Anki legs" rejection was the dictionary-side feature and recorded keeping the reader's export).

PII hygiene now: `UserProfile.email` (a leftover of the simulated login) goes optional-and-empty; nothing in Stage 1 collects anything.

## 4. Stage 2 — one Worker, token identity (kill-gated)

- **Gate** (instrumented via the existing free GoatCounter hook, counting `sync-export`/`sync-import` only): ≥50 round-trips from ≥10 distinct visitors in each of 2 consecutive months, or Wedge hits multi-device friction 3×. Below the gate, manual sync *is* the product and the first server component never ships.
- **Worker + D1**: `GET/PUT/DELETE /store` matching `FetchRemoteStore` byte-for-byte; D1 `docs(user_id, doc, version)`; **`If-Match`/ETag conditional PUT from day one** (client re-pulls and re-merges on 412 — without it, near-simultaneous pushes can drop flags/notes/tags; status survives via never-demote, metadata doesn't). Turnstile on token mint; 2 MB doc cap; PUT throttle (on-close + 1/min).
- **Identity = high-entropy sync token**, generated client-side; cross-device pairing by QR of the token (~40 bytes). No email, no password DB. Word-status is already public-shareable by Wedge's own rule, so bearer-token sensitivity is acceptable — flagged below.
- **Cost, modeled on the real binding constraint.** D1's write quota is not the ceiling; **Workers Free's 100k requests/day is account-wide**, shared with the federation routing Worker that fronts every dict pageview (~6–8 requests each). Sync traffic at the PUT throttle plus dict routing exhausts the shared budget at a few thousand active users, and the exceedance mode is ugly — routed Workers fail open, silently serving the SPA shell for dict URLs. So **Workers Paid is a Stage-2 precondition, priced in from the start: $5/mo base + metered overage past 10M included requests (~$0.30/M). Cloudflare offers no hard spend cap** — mitigations are the client-side PUT throttle, Worker-side rate limiting, and the 2 MB doc cap; the realistic bill at this product's scale is the $5 base. Stated plainly against the no-metered rule: this is a subscription with a metered tail, and Wedge accepts or rejects it by name at sign-off. It is the product's first paid line item and its first server component. Reversal at every stage: unset the env var; local state survives intact.

## 5. Steelman of the rejected option, and the flip

**Magic-link (GROK-BUILD §4.6 rec)** is the one identity flow non-technical learners reliably complete, and email is the only *recovery* story on the table — a lost token orphans the server copy, and never-demote cannot paper over that. If Tsumugu's audience were 10K casual learners tomorrow, magic-link is what you'd build. **Flip:** if Stage 2 ships and lost-token/orphaned-doc complaints exceed ~5% of connected users, or multi-device adoption stalls below half of Stage-2 signups over two months, bolt magic-link onto the same Worker as an *optional recovery binding* (email hash ↔ token), accepting the PII and the $5 email line then. The seam permits it; nothing is rebuilt.

Known weaknesses accepted: a leaked token lets a griefer mark everything known (never-demote blocks demotion, so the ceiling on damage is promotion + metadata noise); the kill-gate measures exports, and privacy-inclined users who block analytics are invisible to it.

## 6. Grammar-known (stretch, separate decision)

No grammar-known state exists anywhere in either repo (grepped; zero hits). The data substrate does: `private/dangdai-grammar-index.merged.json` (1,255 merged points, Books 1–5; the `.FINAL.json` beside it is an empty stub — do not cite it) and ed's 597 `g/` pages. Proposal: `UserDoc@2` adds an optional `grammar: { entries: [...] }` block mirroring the WordEntry clock semantics, capture via a "got it" affordance on lesson grammar cards in the Companion shelf. It rides the same merge, file, and Worker with no schema fork. Price: schema bump + capture UI + per-lesson render, ~1–2 sessions. Recommendation: **in** for the schema slot (cheap now, breaking later), capture UI deferred until the Companion shelf ships.

## 7. Collateral edits owed elsewhere

- PRD-Front-Facing-Copy L29 has the privacy page state "local-only WordStore … no accounts." True in Stage 1 (no server, no collection); Stage 2 changes the sentence — the privacy copy gains a conditional paragraph shipped **with** the Worker, never before.
- PRD-First-Run-Onboarding's "zero accounts" line stays true; the first-run toast becomes "saved on this device · you can carry it as a file."
- `ux-and-features.md` §5.2/§8 ("account owns known-state … MUST") stays overruled: the device owns state; the account carries it.

## 8. Success criteria (falsifiable)

- Round-trip: export on device A, import on device B, grade on both, re-sync — zero demotions, zero lost notes/tags (ETag path exercised in a test).
- A user with no account, no email, and no server reaches full known-state portability using only Stage 1.
- The UserDoc a user downloads today re-imports unchanged after every future schema bump (versioned migration test).
- Stage 2, if built: two devices pair by QR in under a minute; deleting the Worker loses no local state.
- Zero PII fields populated anywhere: no email, no name required, IP not stored by the Worker.
