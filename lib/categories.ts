// The 30 Topper Board categories. Names and order are fixed by the founder: do not rename, merge or reorder.
export type Category = { name: string; slug: string; icon: string };

const RAW: [string, string][] = [
  ["AI Agents & Infrastructure", "🤖"],
  ["SEO & AI Visibility", "🔍"],
  ["Marketing & Advertising", "📣"],
  ["Analytics", "📊"],
  ["Crypto, Web3 & Investing", "🪙"],
  ["Developer Tools", "🛠️"],
  ["Business, Finance & Legal", "💼"],
  ["Security, Privacy & Compliance", "🔒"],
  ["Health, Fitness & Wellness", "💪"],
  ["Social Media & Creator Tools", "📱"],
  ["Leaderboards & Attention Markets", "🏆"],
  ["Hiring, Jobs & Careers", "🧑‍💼"],
  ["Education & Learning", "🎓"],
  ["Agencies, Studios & Services", "🏢"],
  ["Ecommerce & Retail", "🛒"],
  ["Domains & Web Assets", "🌐"],
  ["Games & Entertainment", "🎮"],
  ["People & Profiles", "👤"],
  ["Productivity & Personal Tools", "✅"],
  ["Product Management", "🗂️"],
  ["Design & Creative", "🎨"],
  ["Writing & Content", "✍️"],
  ["Directories, Launch & Discovery", "🚀"],
  ["AI Media Generation", "🖼️"],
  ["Audio, Voice & Podcasting", "🎙️"],
  ["Sales & Lead Generation", "🤝"],
  ["Travel, Local & Lifestyle", "✈️"],
  ["Real Estate & Property", "🏠"],
  ["Media & News", "📰"],
  ["Other", "✨"],
];

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CATEGORIES: Category[] = RAW.map(([name, icon]) => ({ name, slug: slugify(name), icon }));

export const categoryByName = (name: string) => CATEGORIES.find((c) => c.name === name);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const isCategory = (name: unknown): name is string =>
  typeof name === "string" && CATEGORIES.some((c) => c.name === name);
