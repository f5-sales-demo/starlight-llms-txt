// packages/starlight-llms-txt/test/locales.test.ts
import { describe, expect, it } from 'vitest';
import {
  deriveDefaultLang,
  deriveNonDefaultLocales,
  deriveRoutableLocales,
  isDefaultLocaleId,
  isLocaleId,
} from '../locales';

// The 12 non-default locales of a site laid out as `docs/en/`, `docs/ja/`, …
const NON_DEFAULT_KEYS = ['fr', 'es', 'de', 'pt-br', 'ja', 'ko', 'zh-cn', 'zh-tw', 'ar', 'it', 'hi', 'th'];

describe('deriveDefaultLang', () => {
  it('uses the `root` locale’s lang when the default locale is `root`', () => {
    expect(deriveDefaultLang({ defaultLocale: 'root', locales: { root: { lang: 'en' }, ja: { lang: 'ja' } } })).toBe(
      'en',
    );
  });

  it('uses the default locale key when it names a real directory', () => {
    expect(deriveDefaultLang({ defaultLocale: 'en', locales: { en: { lang: 'en' }, ja: { lang: 'ja' } } })).toBe('en');
  });

  it('falls back to `en` when nothing is configured', () => {
    expect(deriveDefaultLang({})).toBe('en');
  });

  it('falls back to `en` when the root locale declares no lang', () => {
    expect(deriveDefaultLang({ defaultLocale: 'root', locales: { root: {} } })).toBe('en');
  });
});

describe('deriveRoutableLocales', () => {
  it('includes the default locale when it occupies a path segment', () => {
    const routable = deriveRoutableLocales({
      defaultLocale: 'en',
      locales: { en: { lang: 'en' }, ja: { lang: 'ja' }, 'pt-br': { lang: 'pt-BR' } },
    });
    expect(routable).toEqual(['en', 'ja', 'pt-br']);
  });

  it('excludes `root`, which has no path segment of its own', () => {
    const routable = deriveRoutableLocales({
      defaultLocale: 'root',
      locales: { root: { lang: 'en' }, ja: { lang: 'ja' } },
    });
    expect(routable).toEqual(['ja']);
  });

  it('returns an empty list for a site with no locales configured', () => {
    expect(deriveRoutableLocales({})).toEqual([]);
  });
});

describe('deriveNonDefaultLocales', () => {
  it('omits the default locale', () => {
    const nonDefault = deriveNonDefaultLocales({
      defaultLocale: 'en',
      locales: { en: { lang: 'en' }, ja: { lang: 'ja' }, ar: { lang: 'ar' } },
    });
    expect(nonDefault).toEqual(['ja', 'ar']);
  });

  it('omits a default locale whose key differs from its lang tag', () => {
    const nonDefault = deriveNonDefaultLocales({
      defaultLocale: 'en-us',
      locales: { 'en-us': { lang: 'en' }, ja: { lang: 'ja' } },
    });
    expect(nonDefault).toEqual(['ja']);
  });

  it('omits `root` as well as the default lang', () => {
    const nonDefault = deriveNonDefaultLocales({
      defaultLocale: 'root',
      locales: { root: { lang: 'en' }, en: { lang: 'en' }, ja: { lang: 'ja' } },
    });
    expect(nonDefault).toEqual(['ja']);
  });
});

describe('isDefaultLocaleId', () => {
  it('treats an `en/`-prefixed id as the default locale when `en` is not a non-default key', () => {
    expect(isDefaultLocaleId('en/demo/deploy', NON_DEFAULT_KEYS)).toBe(true);
    expect(isDefaultLocaleId('en', NON_DEFAULT_KEYS)).toBe(true);
  });

  it('treats an unprefixed id as the default locale', () => {
    expect(isDefaultLocaleId('demo/deploy', NON_DEFAULT_KEYS)).toBe(true);
  });

  it('rejects ids belonging to a non-default locale', () => {
    expect(isDefaultLocaleId('ja/demo/deploy', NON_DEFAULT_KEYS)).toBe(false);
    expect(isDefaultLocaleId('pt-br/demo/deploy', NON_DEFAULT_KEYS)).toBe(false);
    expect(isDefaultLocaleId('ja', NON_DEFAULT_KEYS)).toBe(false);
  });

  it('does not mistake a locale key for a prefix of a longer segment', () => {
    expect(isDefaultLocaleId('italy/overview', NON_DEFAULT_KEYS)).toBe(true);
    expect(isDefaultLocaleId('this-is-hindi', NON_DEFAULT_KEYS)).toBe(true);
  });

  it('treats every id as default when no other locale is configured', () => {
    expect(isDefaultLocaleId('demo/deploy', [])).toBe(true);
    expect(isDefaultLocaleId('/leading-slash', [])).toBe(true);
  });
});

describe('isLocaleId', () => {
  it('matches a non-default locale by prefix', () => {
    expect(isLocaleId('ja/demo/deploy', 'ja', NON_DEFAULT_KEYS, 'en')).toBe(true);
    expect(isLocaleId('ja/demo/deploy', 'ko', NON_DEFAULT_KEYS, 'en')).toBe(false);
  });

  it('resolves the default lang to the default-locale documents', () => {
    expect(isLocaleId('en/demo/deploy', 'en', NON_DEFAULT_KEYS, 'en')).toBe(true);
    expect(isLocaleId('ja/demo/deploy', 'en', NON_DEFAULT_KEYS, 'en')).toBe(false);
  });

  it('resolves `root` to the default-locale documents', () => {
    expect(isLocaleId('demo/deploy', 'root', NON_DEFAULT_KEYS, 'en')).toBe(true);
    expect(isLocaleId('ja/demo/deploy', 'root', NON_DEFAULT_KEYS, 'en')).toBe(false);
  });

  it('does not mistake a locale key for a prefix of a longer segment', () => {
    expect(isLocaleId('italy/overview', 'it', NON_DEFAULT_KEYS, 'en')).toBe(false);
  });
});
