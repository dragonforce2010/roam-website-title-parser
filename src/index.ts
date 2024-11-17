// import 'roamjs-components/types'
import '../types'
import axios from 'axios'

let serviceUrl = 'https://roam.1866.tech'
let parseUrlTitleApi = '/api/parse-url'

// 添加重试配置
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1秒

// 添加类型定义
interface ParseResponse {
  websiteTitle: string;
  error?: string;
}

// 添加新的事件监听器处理回车事件
const enterKeyListener = async (event: KeyboardEvent) => {
  // 只处理回车键
  if (event.key !== 'Enter') return;

  // 获取当前块的内容
  const currentBlock = window.roamAlphaAPI.ui.getFocusedBlock();
  if (!currentBlock) return;

  const currentBlockUid = currentBlock['block-uid'];
  const content = getBlockContent(currentBlockUid);
  
  // 检查当前行是否包含 URL
  const urls = GetUrlsFromString(content);
  if (!urls || urls.length === 0) return;

  // 处理当前行中的所有 URL
  for (let url of urls) {
    await parseWebsiteUrlTitle(url);
  }
};

// 修改 pasteListener 为 async 函数
const pasteListener = async (event: ClipboardEvent) => {
  const pasteContent = event.clipboardData.getData('text');
  const urls = GetUrlsFromString(pasteContent)
  if (!urls || urls.length == 0) return;

  // 移除 setTimeout，直接使用 async/await
  for (let url of urls) {
    await parseWebsiteUrlTitle(url);
  }
};

const GetUrlsFromString = (str: string) => {
  let urlRegex = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g;
  const urls = str.match(urlRegex)
  return urls
};

// 修改 parseWebsiteUrlTitle 函数，添加重试逻辑和错误处理
const parseWebsiteUrlTitle = async (url: string) => {
  if (!url ||
    url.startsWith('https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com') ||
    url.startsWith('https://roamresearch.com')) {
    return;
  }

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const resp = await axios.post<ParseResponse>(
        `${serviceUrl}${parseUrlTitleApi}?url=${encodeURIComponent(url)}`,
        {},
        {
          timeout: 10000,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const { websiteTitle } = resp.data;
      if (!websiteTitle) {
        console.warn(`No title found for URL: ${url}`);
        return;
      }

      const urlWithMarkdownFormat = `[${websiteTitle}](${url})`;
      updateCurrentBlockUrlFormat(url, urlWithMarkdownFormat);
      return;

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === RETRY_ATTEMPTS - 1) {
        console.error(`Failed to parse URL after ${RETRY_ATTEMPTS} attempts:`, url);
        // 可以在这里添加用户提示
        return;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

const getBlockContent = (uid: string) => {
  return (window.roamAlphaAPI.q(`[:find (pull ?page [:block/string])
                      :where [?page :block/uid "${uid}"]  ]`)[0][0] as { string: string }).string;
};

const updateCurrentBlockUrlFormat = async (url: string, urlWithMarkdownFormat: string) => {
  const currentBlock = window.roamAlphaAPI.ui.getFocusedBlock();
  if (!currentBlock) return;

  const uid = currentBlock['block-uid'];
  if (!uid) return;

  const originalContent = getBlockContent(uid);
  const newContent = originalContent.replace(url, urlWithMarkdownFormat);

  // 更新块内容
  await window.roamAlphaAPI.updateBlock({
    block: { uid: uid, string: newContent },
  });

  // 获取更新后的输入元素
  setTimeout(() => {
    const ele = document.activeElement as HTMLInputElement;
    if (ele?.setSelectionRange) {
      ele.setSelectionRange(ele.value.length, ele.value.length);
    }
  }, 100);
};

// 修改事件注册和注销函数
function onunload() {
  window.removeEventListener('paste', pasteListener);
  window.removeEventListener('keydown', enterKeyListener);
}

function onload() {
  window.addEventListener('paste', pasteListener);
  window.addEventListener('keydown', enterKeyListener);
}

export default {
  onload: onload,
  onunload: onunload,
}
