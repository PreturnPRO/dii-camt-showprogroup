// design.md forbids gradient-filled cards; pages that kept a gradient per item (`from-x to-y`)
// get one solid tile in the first stop's hue (600 keeps white text readable).
// Class names are spelled out in full so Tailwind generates them.
const SOLID: Record<string, string> = {
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-600',
  violet: 'bg-violet-600',
  purple: 'bg-purple-600',
  fuchsia: 'bg-fuchsia-600',
  pink: 'bg-pink-600',
  rose: 'bg-rose-600',
  red: 'bg-red-600',
  orange: 'bg-orange-600',
  amber: 'bg-amber-600',
  yellow: 'bg-yellow-600',
  lime: 'bg-lime-600',
  green: 'bg-green-600',
  emerald: 'bg-emerald-600',
  teal: 'bg-teal-600',
  cyan: 'bg-cyan-600',
  sky: 'bg-sky-600',
  slate: 'bg-slate-800',
  gray: 'bg-gray-800',
  zinc: 'bg-zinc-800',
  neutral: 'bg-neutral-800',
  stone: 'bg-stone-800',
};

export const solidBg = (gradient: string) => {
  const match = /(?:^|\s)from-([a-z]+)-\d{2,3}/.exec(gradient);
  return (match && SOLID[match[1]]) || SOLID.blue;
};
