# WO-UNIFY-C — Sync (Account→Sync panel, portable UserDoc, federation-facing derived state)

**Repo:** `/Users/n1/Projects/tsumugu-core` · **App source:** `app/src` · **Package manager:** pnpm@11.5.1
**You are one of four parallel implementation agents.** You will NOT see the PRDs — this brief is complete and self-contained. Do only your lane's work.

---

## 0. Your mission in one paragraph

Convert the simulated-account surface into a **local-only, file-based Sync panel** gated behind a new feature flag (`VITE_FEATURE_SYNC`, default OFF); make the `UserDoc` provably portable across devices; scrub the leftover PII; add the new feature flag surface; and write the two federation-facing derived-state mirrors (a known-character set and a prefs mirror) that the dictionary site will later read from `localStorage`. You own the store, auth, account (becoming Sync), Anki export, the feature-flag module, and `SettingsView`. You do not touch styling (Lane A), shell/router/i18n (Lane B), or platform/dict/build (Lane D). No server code — Sync Stage 1 is 100% local (file export/import + copy-paste sync code + BYO-URL pull). Sync Stage 2 (a Worker + D1) is DEFERRED and out of this WO.

---

## 1. Hard rules

- **Strict file ownership.** Edit ONLY §2 files. Seams → PR notes, not edits.
- **Forbidden paths for ALL lanes:** `scripts/companion/`, `out/companion/`, `docs/companion/`, `mockups/`, `app/public/vault/`.
- **NO server code in this WO.** Sync Stage 1 is local-only: file export/import, `base64url(deflate(UserDoc))` copy/paste sync code, and a BYO-URL `RemoteStore` (pull+merge on load, writes stay manual). The ~300-line Worker + D1 (Stage 2) is DEFERRED — do not build it. The `remoteStore.ts:9-13` seam stays a seam.
- **Everything panel-related ships behind `VITE_FEATURE_SYNC`, default off.** With the flag off there is ZERO sync surface in the product. This is the standing default.
- **Reader/styles untouched.** No CSS edits (Lane A). No shell/router edits (Lane B).
- **Lint gate:** `npx eslint app` exit 0 (root `pnpm lint` shows unrelated mockups/workflows errors). Plus `pnpm typecheck` + named tests.
- **Never demote known words.** The UserDoc merge is clock-aware and must never demote a known word or lose notes/tags. This is the load-bearing invariant of the whole lane.

---

## 2. Files you OWN

```
app/src/store/userStore.ts + userStore.test.ts
app/src/store/userDoc.ts + userDoc.test.ts
app/src/store/remoteStore.ts        (Stage-1 UrlRemoteStore only; Stage-2 seam stays)
app/src/auth/session.ts + session.test.ts
app/src/auth/accountView.ts         (→ becomes the Sync panel)
app/src/account/ankiExport.ts + ankiExport.test.ts
app/src/host/anki.ts                (only importer is accountView.ts)
app/src/config/features.ts          (flag surface — YOU own; add VITE_FEATURE_SYNC)
app/src/settings/SettingsView.ts    (only importer is accountView.ts)
```
You may create new files under `app/src/store/`, `app/src/prefs/` (a NEW module — not the deprecated `prefs/prefs.ts` shim, which is Lane B's), or `app/src/sync/`.

---

## 3. Shared seams — what you expose, what you may assume

### 3a. `config/features.ts` — you own the flags; B/D read them
`FEATURES` is consumed read-only by `main.ts:37,125,170,218,401-408` and `shell/nav.ts:10,61-63,83` (Lane B). **You add `VITE_FEATURE_SYNC`** (default false) to the module. Lane B references `FEATURES.sync` to show/hide the nav "Sync" entry. **Trap T16:** flags are build-time `import.meta.env` at module load, default all OFF — flipping requires rebuild. Lane B is killing the grammar/flashcards nav links, which orphans `FEATURES.grammar`/`.flashcards` — YOU decide keep-or-drop those flags (Lane B will not delete them). Keep the encoding + voice flags gated OFF (standing default).

### 3b. `app/settings.ts` (Lane B owns) — you consume the `Palette` type + read prefs
`SettingsView.ts:8-9`, `store/userDoc.ts:17`, `store/userStore.ts:24-25`, `auth/accountView.ts:26-27` import from `app/settings.ts` (read-only). **Lane B is adding `seal`+`mist` to the `Palette` type with `seal` default.** When you list palettes in `SettingsView`, include `seal` + `mist` (Lane A provides the CSS, Lane B the type). Do NOT redefine the type. Your prefs-mirror (Task C6) reads script/reading/gloss/theme/palette from `app/settings.ts` — read-only; do not edit that file (if you need a new getter, request it from Lane B).

### 3c. `SettingsView.ts` mounts inside Lane B's 設 popover
Lane B is moving Settings out of Account into a nav 設 popover (item 48). YOUR `SettingsView.ts` is the content component; Lane B mounts it in the popover shell. Keep `SettingsView`'s exported mount signature stable and self-contained (it should render palette/theme/script/reading/gloss/rail controls and persist via `app/settings.ts`). Coordinate the mount seam with Lane B in PR notes. This settings surface is NOT gated (ships with the nav rework), independent of `VITE_FEATURE_SYNC`.

### 3d. `userStore` first-grade event → Lane B's first-run toast
Lane B's first-run hero (item 44) fires a one-time toast when the first word is graded. Expose a clean hook/event from `userStore` (e.g. the existing store event stream) that Lane B can subscribe to. Do not build the toast UI — just guarantee the event fires on first grade. **Trap T15:** `main.ts:466-473` (Lane B) rebinds `state.store` via cast on UserStore events named `"store"|"doc"|"sync"` — if you rename those event names you silently break reader recoloring + library re-render. Keep those event names stable, or coordinate a rename with both B and D.

### 3e. Anki export re-surfaces in the Sync panel
Lane B is deleting the FlashcardsView route (item 38). The Anki `.apkg` export (built, `account/ankiExport.ts`) re-surfaces in YOUR Sync panel (Task C1). You own both ends here — no cross-lane seam, just don't leave the export orphaned.

### 3f. `tsumugu-session` key — auth semantics stay yours
Lane B is deleting `shell/home.ts`, which had a `tsumugu-session`-gated bento (trap T3). The key is written by `userStore.login` (userStore.ts:238) and read by `session.ts:148` `isLoggedIn` fallback; `userStore.test.ts` pins the exact key name. Lane B removes the *home bento's* dependence; YOU keep the key's auth semantics intact so `session.ts` + its test stay green. With `FEATURES.accounts` off it's dead in prod but live in tests/dev-force-login.

---

## 4. Your tasks

### C1 — Account surface → Sync panel behind `VITE_FEATURE_SYNC` *(item 47)*
Add `VITE_FEATURE_SYNC` (default false) to `features.ts`. Convert `auth/accountView.ts` into a **Sync panel** that appears only when the flag is on. Remove the simulated magic-link from the user path (keep `auth/session.ts` in the tree — it's still referenced; just delete the fake-login UI path). The panel carries:
- **File export** (already exists, `accountView.ts:330`) — download the `UserDoc` as a file.
- **NEW file import** — file picker / drag-drop → `mergeUserDocs` (the clock-aware merge). Round-trip must never demote/lose data.
- **Web Share API handoff** — share the exported doc where supported.
- **Sync code** = `base64url(deflate(UserDoc))` copy/paste (~120KB at ~2,500 entries). QR transport is CUT from the doc path — do not add QR.
- **`UrlRemoteStore implements RemoteStore`** — BYO URL: pull + merge on load; writes stay manual export (no auto-push).
- **Anki `.apkg` export** surfaced here (from `account/ankiExport.ts`).
- **GoatCounter kill-gate counters** `sync-export` / `sync-import` — call Lane D's `trackEvent` (read-only import from `build/analytics.ts`) on each action so usage is measurable for the Stage-2 kill-gate. (If `trackEvent` needs a new event-name arg shape, coordinate with Lane D; don't edit analytics.ts.)

With the flag OFF: no Sync surface renders anywhere. Tests: import round-trip via `mergeUserDocs`; sync-code encode/decode symmetry; `UrlRemoteStore` merge; flag-off = no surface.

### C2 — Settings out of Account → 設 popover component *(item 48)*
Make `SettingsView.ts` a self-contained settings component (palette incl. seal+mist / theme / script / reading / gloss / rail), persisting through `app/settings.ts`. Lane B mounts it in the nav 設 popover. This closes v1-STATUS Review #7 ("Settings buried in Account"). NOT gated. Coordinate the mount seam with Lane B.

### C3 — PII hygiene *(item 49)*
`UserProfile.email` in `store/userDoc.ts` → optional-and-empty (a simulated-login leftover). Nothing is collected. Update `userDoc.test.ts`. The privacy story Lane B writes must stay true: local-only, cookieless, no accounts, nothing collected.

### C4 — UserDoc portability tests *(item 50)*
Add tests in `store/userDoc.test.ts` proving portability:
- Export on device A → import on device B → grade words on both → re-sync (merge) = **zero demotions, zero lost notes, zero lost tags**.
- **Versioned-migration test:** today's `UserDoc` re-imports cleanly after every future schema bump (write the test so a schema version increment doesn't silently drop data). This IS the deliverable — it locks the portability guarantee.

### C5 — Derived known-character set for federation *(item 30)*
On every `WordStore` change, write a compact **known-char set** to `localStorage` key `tsumugu.knownChars.v1`. Version the tint rule alongside the key: **"a character tints iff it is exactly-known OR it is contained in a known word."** This is the data the dictionary site (separate repo, Lane D wires the routing) will read to tint characters on dict pages. Put the derivation in a new module (e.g. `app/src/store/knownChars.ts`); hook it off the existing `userStore` change event. Tests: set derivation unit tests (exact-known char tints; char inside a known multi-char word tints; unknown char does not).

### C6 — Prefs mirror for federation *(item 31)*
Mirror script / reading / gloss / theme / palette into `localStorage` key `tsumugu.prefs.v1` whenever they change. The dictionary site reads this as its default when its own `ted-*` keys are unset. Put this in a new module (e.g. `app/src/prefs/prefsMirror.ts` — NOT the deprecated `prefs/prefs.ts` shim, which is Lane B's). Read current values from `app/settings.ts` (read-only). Test: changing each pref updates the mirror key; shape is stable/versioned.

### C7 — Grammar-known schema slot (cheap-now, breaking-later) *(item 51)*
Add an OPTIONAL `grammar` schema slot to `UserDoc` (bump to `UserDoc@2` if that's the versioning convention). Adding it now is cheap; adding it later is a breaking migration. **No capture UI in this WO** — capture is deferred to the Companion shelf (Lane A) later. Just reserve the slot so the schema is forward-compatible, and make sure Task C4's migration test covers a doc with and without the slot. (The final accept/retune of the exact schema + Stage-2 kill-gate numbers is Wedge's call — implement the recommended optional-slot approach and note the open decision in PR.)

### C8 — Feature-flag disposition + audit tail (your files) *(item 58)*
- Decide keep-or-drop for the now-orphaned `FEATURES.grammar` / `.flashcards` flags (Lane B stopped referencing them). If dropped, remove cleanly; if kept, comment why.
- `importPanel.ts:47-53` gated-capture skeleton is Lane D's file — flag it, don't edit.
- Account-route blank-overlay (`main.ts:343-352`, Lane B) is MOOT if the Account panel is absorbed into your Sync panel — coordinate with Lane B: confirm the account route either disappears or points at the Sync panel.
- Any orphan exports in YOUR files (e.g. unused session helpers) — wire or delete; lint + tsc green.

---

## 5. Booby traps

- **T3 — `tsumugu-session` gate.** Keep the key's write (userStore.login) + read (session.ts isLoggedIn fallback) semantics; `userStore.test.ts` pins the exact key name. Lane B's home deletion must not break `session.ts` — that's why the auth semantics stay in your lane.
- **T15 — `state.store` rebind hack.** `main.ts:466-473` (Lane B) reassigns `state.store` via cast on UserStore events named `"store"|"doc"|"sync"`. Renaming these silently breaks reader recoloring + library re-render. Keep event names stable.
- **T16 — FEATURES are build-time env**, default all OFF; flipping requires rebuild. Keep nav template (Lane B) + main branches consistent with which flags you keep.
- **Merge invariant** — the clock-aware merge (`userDoc.ts`) must NEVER demote a known word (userDoc.test.ts pins "never demote known"). Every new import/sync path routes through the same merge; do not add a naive last-write-wins path.
- **remoteStore seam** — `remoteStore.ts:9-13` is the Stage-2 seam. Your `UrlRemoteStore` (Stage-1 pull-only) implements the same `RemoteStore` interface; do not collapse the seam or add Worker/`FetchRemoteStore` code (that's the deferred Stage 2).
- **No network in import files** — Lane D's `import/prepareFromText.ts` + `importPanel.ts` are guarded by `noNetwork.test.ts` (bans `fetch|XMLHttpRequest|WebSocket|sendBeacon`). Your file-import UI lives in the Sync panel (`accountView.ts`), not in those files — keep it that way.

---

## 6. Acceptance checks

1. `pnpm typecheck` → exit 0.
2. `npx eslint app` → exit 0.
3. `pnpm test` → green, including: import round-trip (`mergeUserDocs`), sync-code encode/decode, `UrlRemoteStore` merge, flag-off = no surface, `userDoc.test.ts` portability + versioned-migration, `knownChars` derivation, prefs-mirror, `session.test.ts` (tsumugu-session fallback intact), `ankiExport.test.ts`, `userStore.test.ts`.
4. `pnpm build` → green.
5. **Behavior:** with `VITE_FEATURE_SYNC` off, no Sync surface exists; with it on, the panel offers file export/import + Web Share + copy-paste sync code + BYO-URL pull + Anki export; export→import round-trip loses nothing and never demotes; `tsumugu.knownChars.v1` + `tsumugu.prefs.v1` update on the relevant changes; `UserProfile.email` is optional-and-empty.

## 7. Umbrella §5 defects you must burn down

- simulated magic-link removed from user path; Account absorbed into gated Sync panel.
- Settings pulled out of Account (v1-STATUS Review #7).
- PII (`UserProfile.email`) scrubbed.
- orphaned FEATURES flags disposed.

## 8. You must NOT do

- Do NOT write ANY server/Worker/D1 code (Stage 2 is deferred; keep the `remoteStore.ts:9-13` seam).
- Do NOT add QR to the doc transport (cut).
- Do NOT edit `styles/*`, `catalog/*`, `library/*`, `fixtures/*` (Lane A).
- Do NOT edit `main.ts`, `router.ts`, `nav.ts`, `strings.ts`, `staticPages.ts`, `home.ts`, `seo/meta.ts`, `app/settings.ts`, `prefs/prefs.ts` (Lane B) — reference/read-only + PR-note seams.
- Do NOT edit `pwa/`, `dict/`, `build/analytics.ts`, `host/httpVault.ts`, `config/site.ts`, `vite.config.ts`, `import/*`, `scripts/` (Lane D) — call their exports read-only.
- Do NOT un-gate encoding/voice flags (stay OFF).
- Do NOT build a grammar-capture UI (schema slot only).
- Do NOT touch forbidden paths.

## Amendments — 2026-07-02 sign-offs (binding; read before starting)

1. **Grammar-known schema slot is SIGNED IN**: `UserDoc@2` adds an optional `grammar: { entries: GrammarEntry[] }` block mirroring the word-entry clock semantics (`statusUpdatedAt`, never-demote merge). Schema + merge + round-trip tests only — NO capture UI this lane.
2. Stage-2 kill-gate numbers signed as specced (≥50 round-trips / ≥10 visitors / 2 consecutive months); wire the two GoatCounter-gated counters (`sync-export`, `sync-import`) behind the existing analytics stub.
3. The Sync panel carries the built Anki `.apkg` export (signed amendment of PRD v1 §1.3/§8.4).
4. `UserProfile.email` goes optional-and-empty (zero-PII posture, signed).
