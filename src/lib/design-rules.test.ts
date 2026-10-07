import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// design.md §1 "Absolute Prohibitions": no gratuitous gradients, no glassmorphism, no glows.
// Checked per class string (each quoted/template segment), so allowed uses can be told apart:
// gradient title text (bg-clip-text), small icon/avatar chips (w/h ≤ 12), modal overlays.

const files = globSync('src/**/*.tsx').filter((file) => !file.includes('/components/ui/'));

const classStrings = (source: string) => source.split(/["'`]/);

const isSmallChip = (cls: string) => /\b(?:w|h|size)-(?:[1-9]|1[0-2])(?:\.5)?\b/.test(cls) && !/\b(?:w|h)-(?:1[3-9]|[2-9]\d|full|screen)\b/.test(cls);
const isOverlay = (cls: string) => /\bfixed\b/.test(cls) && /\binset-0\b/.test(cls);

type Rule = { name: string; offends: (cls: string) => boolean; marketingAllowed?: boolean };

// a big bold heading that is not a monospace number: a page/section title, usually Thai
const isTitle = (cls: string) =>
  /(?:^|\s)(?:[a-z]+:)?text-(?:2xl|3xl|4xl|5xl|6xl|7xl)\b/.test(cls) && /\bfont-(?:bold|extrabold|black)\b/.test(cls) && !/\bfont-mono\b/.test(cls);
// the public landing hero may be larger than an in-app page title
const MARKETING = new Set(['src/pages/LandingPage.tsx']);

const RULES: Rule[] = [
  {
    name: 'gradient-filled surface (cards, banners, heroes, stat tiles)',
    offends: (cls) => /\bbg-gradient-to-/.test(cls) && !/\bbg-clip-text\b/.test(cls) && !isSmallChip(cls),
  },
  { name: 'glassmorphism (backdrop-blur outside a modal overlay)', offends: (cls) => /\bbackdrop-blur/.test(cls) && !isOverlay(cls) },
  { name: 'decorative blurred blob', offends: (cls) => /\bblur-(?:xl|2xl|3xl|\[\d+px\])/.test(cls) },
  { name: 'arbitrary gradient background', offends: (cls) => /\bbg-\[(?:radial|linear|conic)-gradient/.test(cls) && !/_1px,transparent_1px/.test(cls) }, // the faint 1px grid backdrop (design.md §4.8) is allowed
  // a codemod once left `bg-black/50-[2px]` behind: an opacity suffix glued to another token is never valid
  { name: 'broken class token', offends: (cls) => /(?:^|\s)[a-z:-]+\/\d+-\[/.test(cls) },
  { name: 'white text on a white surface', offends: (cls) => /(?<![:\w/-])bg-white(?![/\w-])/.test(cls) && /(?<![:\w-])text-white(?![/\w-])/.test(cls) },
  {
    name: 'light surface with no dark-mode colour',
    offends: (cls) => /(?<![:\w/-])bg-(?:white|gray-50|slate-50)(?![/\w-])/.test(cls) && /\bdark:text-(?:white|slate-[12]00)\b/.test(cls) && !/\bdark:bg-/.test(cls),
  },
  // Por's Thai typography rule: no letter-spacing on Thai text (design.md's tracking-tight is for Latin numbers)
  { name: 'letter-spacing on a title', offends: (cls) => isTitle(cls) && /\btracking-(?:tight|tighter)\b/.test(cls) },
  { name: 'oversized in-app title (design.md §4.1/§5: up to lg:text-4xl)', offends: (cls) => isTitle(cls) && /\btext-(?:5xl|6xl|7xl)\b/.test(cls), marketingAllowed: true },
  { name: 'glow shadow', offends: (cls) => /shadow-\[0_0_/.test(cls) || /\bshadow-(?:blue|indigo|purple|violet|emerald|amber|orange|rose|pink|cyan|sky)-\d{3}\//.test(cls) },
];

describe('design.md visual rules', () => {
  for (const rule of RULES) {
    it(`no ${rule.name}`, () => {
      const offenders = files.flatMap((file) => {
        if (rule.marketingAllowed && MARKETING.has(file)) return [];
        const source = readFileSync(file, 'utf8');
        const hits = classStrings(source).filter(rule.offends);
        return hits.length ? [`${file} (${hits.length})`] : [];
      });
      expect(offenders).toEqual([]);
    });
  }
});
