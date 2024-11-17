import axios from 'axios';
import { CONFIG } from '../config/constants';
import { ParseResponse } from '../types';
import { getBlockContent, updateBlock, updateCursorPosition } from '../utils/roam';
import { isMarkdownUrl } from '../utils/url';

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
      const resp = await axios.post<ParseResponse>(
        `${CONFIG.SERVICE_URL}${CONFIG.PARSE_URL_API}?url=${encodeURIComponent(url)}`,
        {},
        {
          timeout: CONFIG.REQUEST_TIMEOUT,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const { websiteTitle } = resp.data;
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