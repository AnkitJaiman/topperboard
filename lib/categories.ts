// The 30 Topper Board categories. Names and order are fixed by the founder: do not rename, merge or reorder.
/** `code` is a short ticker-style tag shown next to the name. */
export type Category = { name: string; slug: string; code: string };

const RAW: [string, string][] = [
  ["AI Agents & Infrastructure", "AGT"],
  ["SEO & AI Visibility", "SEO"],
  ["Marketing & Advertising", "MKT"],
  ["Analytics", "ANL"],
  ["Crypto, Web3 & Investing", "CRY"],
  ["Developer Tools", "DEV"],
  ["Business, Finance & Legal", "BIZ"],
  ["Security, Privacy & Compliance", "SEC"],
  ["Health, Fitness & Wellness", "HLT"],
  ["Social Media & Creator Tools", "SOC"],
  ["Leaderboards & Attention Markets", "LDR"],
  ["Hiring, Jobs & Careers", "JOB"],
  ["Education & Learning", "EDU"],
  ["Agencies, Studios & Services", "AGY"],
  ["Ecommerce & Retail", "ECM"],
  ["Domains & Web Assets", "DOM"],
  ["Games & Entertainment", "GME"],
  ["People & Profiles", "PPL"],
  ["Productivity & Personal Tools", "PRD"],
  ["Product Management", "PM"],
  ["Design & Creative", "DSN"],
  ["Writing & Content", "WRT"],
  ["Directories, Launch & Discovery", "DIR"],
  ["AI Media Generation", "GEN"],
  ["Audio, Voice & Podcasting", "AUD"],
  ["Sales & Lead Generation", "SLS"],
  ["Travel, Local & Lifestyle", "TRV"],
  ["Real Estate & Property", "RE"],
  ["Media & News", "NWS"],
  ["Other", "OTH"],
];

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CATEGORIES: Category[] = RAW.map(([name, code]) => ({ name, slug: slugify(name), code }));

export const categoryByName = (name: string) => CATEGORIES.find((c) => c.name === name);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const isCategory = (name: unknown): name is string =>
  typeof name === "string" && CATEGORIES.some((c) => c.name === name);
