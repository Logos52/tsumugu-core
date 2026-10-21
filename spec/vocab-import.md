# Vocab import format v1

Two inputs. A JSON document of the user's tracked vocabulary, or a pasted list of words they are currently learning. Each import is one of those inputs. This file is the contract Wedge settled. `app/src/import/vocabImport.ts` implements it. `mergeUserDocs` stays the sync path. Stored documents stay at schema 2. The importer reads schema 2 and schema 3.

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

A user document at schema 2 or schema 3. The entries live on `store`. The app writes schema 2, so a user's own export is schema 2. Schema 3 is the same read-only input.

```json
{
  "schema": 2,
  "store": {
    "schema": "tsumugu/word-store@2",
    "entries": []
  }
}
```

`schema` on the user document is the number 2 or the number 3. `schema` on the word-store document is the string `tsumugu/word-store@2`. Profile, settings, progress, grammar, and a document-level `updatedAt` are outside the subset. v1 does not apply them. Reading a document does not change the schema the app writes.

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

Each word is Traditional Chinese. Each word is stored at status `"1"`. A word whose current status is `"4"` or `"known"` stays at that status.

A word at `"2"`, `"3"`, or `"ignored"`, and a word that was absent, is stored at `"1"`.

[spec/examples/learning-list.txt](examples/learning-list.txt) splits into `朋友`, `學習`, `今天`, `明天`, `你好`, `謝謝`, `看見`, and `聽見`. An already-`known` or `"4"` `朋友` stays at that status. The other words are stored at `"1"`.

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

`importVocabJson` reads a user document at schema 2 or schema 3, and a word-store document at `tsumugu/word-store@2`. It does not write a schema. `app/src/store/userDoc.part2.ts` sets `USER_DOC_SCHEMA = 2`. `emptyUserDoc` and `toUserDoc` write `2`. `migrateUserDoc` rewrites whatever schema number it is given to `2`. Nothing in this repo writes schema `3`. Whether stored documents move to 3 is still open. A user's export today is schema 2, and this importer accepts that file.

The word-store string matches. `emptyUserDoc` writes `"tsumugu/word-store@2"`. Legacy `WORD_STORE_SCHEMA` is that same string. Legacy `WordStoreDoc.schema` also allows `"tsumugu/word-store@1"`. v1 accepts `@2`.

### Clock field

The importer reads per-word `updatedAt`. The later time wins. Equal times, and two omitted times, keep the later entry in the file. A present `updatedAt` beats an omitted one. An `updatedAt` that is present and is not a timestamp rejects the file.

Legacy `WordEntry` stores `statusUpdatedAt`. The importer does not write `updatedAt` onto the entry. `setStatus` still stamps `statusUpdatedAt`. When the destination already has the word, that stored `statusUpdatedAt` is the word's clock for the same comparison, and a tie applies the import. `mergeUserDocs` in `app/src/store/userDoc.part1.ts` is unchanged: it still reconciles with `statusUpdatedAt` and `policy: "never-demote"`.

A file from `toUserDoc` carries `statusUpdatedAt` and no per-word `updatedAt`. This importer does not read `statusUpdatedAt` from the file, so that export clock stays invisible here. `importUserDoc` remains the path for those files.

### `lang`

A missing `lang` takes the document language, in this order: a `lang` string on the import document, otherwise the one `lang` shared by entries that name one, otherwise the destination store's language when every stored entry shares one `lang`, otherwise `"zh-Hant"`. An entry that names `lang` keeps it. `WordStore.fromDoc` is unchanged and still drops a row with no `lang`.

### Sync import

`importUserDoc` still runs `migrateUserDoc`, then `mergeUserDocs`. It does not use this subset, these aliases, or "later entry wins." `importFromFile` still surfaces a `JSON.parse` error and leaves the store unassigned. `prepareFromText` still builds prepared content and does not write status `"1"`.

### Paste and "4"

The paste leaves `"4"` and `"known"` in place. `"ignored"` is stored at `"1"`. README calls `"4"` Learned and `"1"` New. A pasted Learned word stays Learned.

### Left unspecified

- A pasted token that is not Traditional Chinese.
- Separators other than newline, comma, ASCII space, and `、`.
