import { CONFIG } from '../config/constants';
import { getBlockContent, updateBlock, updateCursorPosition } from '../utils/roam';
import { isMarkdownUrl } from '../utils/url';

async function getWebsiteTitle(url: string): Promise<string> {
  try {
    // Fetch the HTML content of the URL
    const response = await fetch(`https://us-central1-firescript-577a2.cloudfunctions.net/proxy-corsAnywhere/${url}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    // Get the text content of the response
    const html = await response.text();

    // Parse the HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Get the <title> tag content
    const title = doc.querySelector('title').innerText;
    return title;
  } catch (error) {
    console.error("Error fetching the website title:", error);
    return null;
  }
}

export async function parseWebsiteUrlTitle(
  url: string, 
  blockUid: string, 
  processedUrls: Set<string>
): Promise<void> {
  const taskKey = `${url}-${blockUid}`;
  if (processedUrls.has(taskKey)) return;

  if (isMarkdownUrl(url) || CONFIG.EXCLUDED_URLS.some(excluded => url.startsWith(excluded))) {
    processedUrls.add(taskKey);
    return;
  }

  const currentContent = getBlockContent(blockUid);
  
  const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  const contentWithoutMarkdown = currentContent.replace(markdownLinkRegex, '');
  
  if (!contentWithoutMarkdown.includes(url)) {
    processedUrls.add(taskKey);
    return;
  }

  for (let attempt = 0; attempt < CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      let websiteTitle;
      try {
        websiteTitle = await getWebsiteTitle(url);
      } catch (e) {
        // 如果获取标题失败，继续重试
        continue;
      }

      if (!websiteTitle) {
        processedUrls.add(taskKey);
        return;
      }

      await updateBlockUrlFormat(url, websiteTitle, blockUid);
      processedUrls.add(taskKey);
      return;

    } catch (error) {
      if (attempt === CONFIG.RETRY_ATTEMPTS - 1) {
        processedUrls.add(taskKey);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    }
  }
}

async function updateBlockUrlFormat(url: string, title: string, blockUid: string): Promise<void> {
  const originalContent = getBlockContent(blockUid);
  if (!originalContent) return;

  const urlWithMarkdownFormat = `[${title}](${url})`;
  
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urlRegex = new RegExp(`(?<!\\()${escapedUrl}(?!\\))`, 'g');
  const newContent = originalContent.replace(urlRegex, urlWithMarkdownFormat);

  if (newContent !== originalContent) {
    await updateBlock(blockUid, newContent);
    updateCursorPosition();
  }
} 