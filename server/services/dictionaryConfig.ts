// Dictionary source configuration
// Change DICTIONARY_SOURCE to switch between providers:
//   'merriam-webster'  - MW Learner's + Collegiate APIs (requires API keys; has etymology)
//   'free-dictionary'  - Free Dictionary API: v1 primary (freedictionaryapi.com, broader coverage),
//                        v2 fallback (dictionaryapi.dev) for transient v1 errors. No API key required.
export const DICTIONARY_SOURCE: 'merriam-webster' | 'free-dictionary' = 'free-dictionary';
