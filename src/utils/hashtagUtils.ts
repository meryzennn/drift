export function extractHashtags(content: string): { tag: string; display_tag: string }[] {
  if (!content) return [];

  const regex = /#[a-zA-Z0-9_]+/g;
  const matches = content.match(regex) || [];

  const seen = new Set<string>();
  const hashtags: { tag: string; display_tag: string }[] = [];

  for (const match of matches) {
    const normalized = match.slice(1).toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      hashtags.push({ tag: normalized, display_tag: match });
    }
  }

  return hashtags;
}

export function normalizeHashtag(hashtag: string): string {
  return hashtag.replace(/^#/, '').toLowerCase();
}
