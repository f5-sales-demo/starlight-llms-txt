---
'@f5-sales-demo/starlight-llms-txt': minor
---

Generate the llms.txt surface for every locale, not just the default one.

A multilingual site previously produced `/<locale>/llms-full.txt` and
`/<locale>/llms-small.txt` that nothing linked to, and no per-locale index or
tiered hierarchy at all — so a non-default-locale consumer had no entry point and
no progressive path, only a single multi-hundred-kilobyte document.

- New `/[locale]/llms.txt` index for every locale that occupies a URL path
  segment, including the default locale. The default locale's index links the
  existing root documents rather than duplicating them.
- The `/_llms-txt/` tiered hierarchy now covers every locale. Document ids carry
  the locale in their first path segment, so its top tier becomes a language
  selector with the full depth of tiers beneath each language.
- The root `llms.txt` gains a `## Translations` block listing each other
  language's index.

Sites with a single locale, and sites whose default locale is `root`, are
unaffected: no `/root/…` route is emitted and their `llms.txt` is unchanged.
