export const ATTRIBUTE_PROMPT_VERSION = "attribute-enrichment-v1";

export const ATTRIBUTE_ENRICHMENT_INSTRUCTIONS = [
  "Convert store menu data into the supplied recommendation attribute schema.",
  "Return exactly one result per requested menu ID and never invent or duplicate IDs.",
  "Never create attributes outside the schema.",
  "Prefer owner descriptions and structured category/options over menu names.",
  "Use other menus only as store context, without stretching semantic values.",
  "When evidence is weak, set confidence low and unknown true.",
  "Evidence must be short and must not contain hidden reasoning or recommendations.",
].join(" ");
