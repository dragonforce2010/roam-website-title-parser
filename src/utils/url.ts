export function isMarkdownUrl(url: string): boolean {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
  return markdownLinkRegex.test(url);
}

export function GetUrlsFromString(str: string): string[] | null {
  if (!str) return null;

  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const urls = str.match(urlRegex);
  
  if (!urls) return null;

  return Array.from(new Set(urls)).filter(url => !isMarkdownUrl(url));
} 