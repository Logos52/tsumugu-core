# Vocab import format v1

Two inputs. A JSON document of the user's tracked vocabulary, or a pasted list of words they are currently learning. Each import is one of those inputs. This file is the contract Wedge settled. No parser in this repository implements it. The last section records where the code differs.

Examples: [spec/examples/known-vocab.json](examples/known-vocab.json), [spec/examples/learning-list.txt](examples/learning-list.txt), [spec/examples/unknown-status.json](examples/unknown-status.json), [spec/examples/bad-json.txt](examples/bad-json.txt).

## JSON

The JSON input is one of two documents. Both carry the same entry subset.

A word-store document:

```json
{
  "schema": "tsumugu/word-store@2",
  "entries": []
}
```

A user document at schema 3. The entries live on `store`:

```json
{
  "schema": 3,
  "store": {
    "schema": "tsumugu/word-store@2",
    "entries": []
  }
}
```

`schema` on the user document is the number 3. `schema` on the word-store document is the string `tsumugu/word-store@2`. Profile, settings, progress, grammar, and a document-level `updatedAt` are outside the subset. v1 does not apply them.

A bare array is not a v1 document.

### Entry subset

v1 reads three keys from each entry. The entry is a read-only subset of `WordEntry`.

| Key | Required | Meaning |
|---|---|---|
| `word` | yes | The headword. |
| `status` | yes | A canonical status or an alias, below. |
| `updatedAt` | no | ISO-8601 clock for that word. |

Any other key on the entry is outside the subset. v1 does not apply it.

### Status

Canonical values are the strings `"1"`, `"2"`, `"3"`, `"4"`, `"known"`, and `"ignored"`. A word at new is absent from the file. The string `"new"` is an unknown status.

Aliases are these exact strings. v1 maps them before it compares entries:

| Alias | Canonical |
|---|---|
| `l1` | `1` |
| `l2` | `2` |
| `l3` | `3` |
| `l4` | `4` |
| `learning-1` | `1` |
| `learning-2` | `2` |
| `learning-3` | `3` |
| `learning-4` | `4` |

`learning-N` is those four strings. A JSON number is an unknown status. The canonical form of the first learning status is the string `"1"`.

### Same word more than once

After alias mapping, entries with the same `word` are one word.

- The later `updatedAt` wins. Comparison is by time. A present `updatedAt` is later than an omitted one.
- Equal timestamps are a tie. The later entry in the file wins.
- Two omitted timestamps are a tie. The later entry in the file wins.

Later means later in array order.

```json
{
  "schema": "tsumugu/word-store@2",
  "entries": [
    { "word": "朋友", "status": "1", "updatedAt": "2026-06-24T09:00:00.000Z" },
    { "word": "朋友", "status": "known", "updatedAt": "2026-06-24T10:00:00.000Z" },
    { "word": "學習", "status": "2" },
    { "word": "學習", "status": "3" }
  ]
}
```

`朋友` is `known` because `10:00` is later than `09:00`. `學習` is `"3"` because the second entry is later and neither clock is set.

[spec/examples/known-vocab.json](examples/known-vocab.json) stores `朋友` as `known`, `學習` as `"3"` (`l3`), and `今天` as `"1"` (`learning-1`).

## Pasted list

Separators are the newline, the comma `,`, the ASCII space, and the ideographic comma `、`. Consecutive separators produce no empty word. A tab is not a separator.

Each word is Traditional Chinese. Each word is stored at status `"1"`. A word whose current status is `"known"` stays `"known"`.

A word at `"2"`, `"3"`, `"4"`, or `"ignored"`, and a word that was absent, is stored at `"1"`.

[spec/examples/learning-list.txt](examples/learning-list.txt) splits into `朋友`, `學習`, `今天`, `明天`, `你好`, `謝謝`, `看見`, and `聽見`. An already-`known` `朋友` stays `known`. The other seven words are stored at `"1"`.

## Errors

### Unknown status

A status that is not a canonical string and not an alias is an unknown status. That includes `"new"`, `"l5"`, `"learning-0"`, `"learning-5"`, `""`, a JSON number, and any other string.

Expected behavior: the JSON import does not apply. The error names the word and the status string. The store stays as it was. [spec/examples/unknown-status.json](examples/unknown-status.json) is this case (`山` / `"new"`).

### Bad JSON

The JSON input does not parse.

Expected behavior: the import does not apply. The error is the parse error. The store stays as it was. [spec/examples/bad-json.txt](examples/bad-json.txt) is this case.

The pasted-list input is parsed as text. JSON syntax errors in that box stay word-list text.

## Cross-check

Checked against this repository and against `Logos52/tsumugu-engine-legacy` `packages/engine/src/types.ts` and `packages/engine/src/store/wordStore.ts` (default branch, 2026-10-21). The legacy file is the engine source. This repo's CI stub types `WordStatus` as `string`.

### Status union

Call sites in this repo use the strings `"1"`, `"2"`, `"3"`, `"4"`, `"known"`, and `"ignored"`.

- `README.md` states that union, with `1` = New and `4` = Learned.
- `app/src/account/ankiExport.ts` exports `["1", "2", "3", "4", "known"]`.
- `app/src/engine.test.ts` expects `getStatus` of an untracked word to be `"1"`, and `statusColorClass("1")` to be `tsg-status-1`.
- `packages/gen-qa/src/bridge.ts` treats `"4"` and `"known"` as known.
- `app/src/styles/base.part1.css` paints `.tsg-status-1` with `.w.new`, and `.tsg-status-2`, `.tsg-status-3`, `.tsg-status-4` with `.w.learning`.

`scripts/ci/engine-stub/index.d.ts` types `WordEntry.status` and `WordStatus` as `string`. It does not encode the union.

The legacy `types.ts` still declares `WordStatus` as `"new" | "l1" | "l2" | "l3" | "l4" | "known" | "ignored"`. Legacy `getStatus` returns `"new"` when the word is absent. Legacy `DEFAULT_KNOWN_STATUSES` is `["l4", "known", "ignored"]`. `AGENTS.md` says the install script rewrites that union to `"1" | "2" | "3" | "4" | "known" | "ignored"` before this repo typechecks. The file on GitHub still has the old union.

v1 follows the union this repo's call sites use. `"l1"` through `"l4"` are import aliases. They are the legacy stored values.

### UserDoc schema

v1 uses the number `3` on the user document. `app/src/store/userDoc.part2.ts` sets `USER_DOC_SCHEMA = 2`. `emptyUserDoc` and `toUserDoc` write `2`. `migrateUserDoc` rewrites whatever schema number it is given to `2`. Nothing in this repo writes schema `3`.

The word-store string matches. `emptyUserDoc` writes `"tsumugu/word-store@2"`. Legacy `WORD_STORE_SCHEMA` is that same string. Legacy `WordStoreDoc.schema` also allows `"tsumugu/word-store@1"`. v1 accepts `@2`.

### Clock field

v1 reads per-word `updatedAt`.

Legacy `WordEntry` has `statusUpdatedAt`. It has no per-word `updatedAt`. `WordStoreDoc.updatedAt` is the document clock. `setStatus` writes `statusUpdatedAt`. `mergeUserDocs` in `app/src/store/userDoc.part1.ts` reconciles with `statusUpdatedAt` and `policy: "never-demote"`. A file from `toUserDoc` or `WordStore.toDoc` carries `statusUpdatedAt` on each entry. v1 does not read that key, so the export clock is invisible to this format.

### `lang` and validation

Legacy `WordEntry` requires `lang` and `word`. `WordStore.fromDoc` drops an entry whose `lang` or `word` is not a string, and it stores the `status` string it is given. It does not map aliases and it does not reject `"new"`.

v1 entries have no `lang` key. Writes in this app use `lang: "zh-Hant"` (`app/src/store/userDoc.test.ts`, `app/src/account/ankiExport.ts`). Passing a v1 entry through `WordStore.fromDoc` as written drops it, because `lang` is missing.

### Importer that exists today

`importUserDoc` in `app/src/store/userStoreMethods2.ts` runs `migrateUserDoc`, then `mergeUserDocs`. That path merges a full user document. It does not apply this subset, these aliases, or "later entry wins."

`importFromFile` in `app/src/auth/accountView.part2.ts` parses with `JSON.parse`. A parse error is caught, the message is `sync.importFailed` plus `Error.message`, and the store is left unassigned. That matches the bad-JSON rule. The same function does not check status, so an unknown status is stored today.

`app/src/import/prepareFromText.ts` turns pasted reading text into prepared content. It does not write status `"1"`.

### "Already known"

The paste rule leaves a word alone when its status is the string `"known"`.

`packages/gen-qa/src/bridge.ts` also treats `"4"` as known. Legacy `DEFAULT_KNOWN_POLICY` treats `l4`, `known`, and `ignored` as known. `app/src/catalog/coverage.ts` uses `DEFAULT_KNOWN_POLICY.knownStatuses` from the engine. The paste rule does not. A pasted word at `"4"` or `"ignored"` is stored at `"1"`. README calls `"4"` Learned and `"1"` New, so a paste of a Learned word stores it as New.

### Left unspecified

- An `updatedAt` value that is present and is not a timestamp.
- A pasted token that is not Traditional Chinese.
- Separators other than newline, comma, ASCII space, and `、`.
