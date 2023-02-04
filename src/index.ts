// import 'roamjs-components/types'
import '../types'

let serviceUrl = 'https://ec2-54-254-24-184.ap-southeast-1.compute.amazonaws.com'
// let serviceUrl = 'http://localhost:3000/api'

// parseWebsiteTitleFromUrl need to be changed to parse-url-title
let parseUrlTitileApi = 'parseWebsiteTitleFromUrl'
// let parseUrlTitileApi = 'parseWebsiteTitleFromUrl'

const pasteListener = (event: ClipboardEvent) => {
  const pasteContent = event.clipboardData.getData('text');
  const urls = GetUrlsFromString(pasteContent)
  if (!urls || urls.length == 0) return;

  setTimeout(() => {
    for (let url of urls) {
      parseWebsiteUrlTitle(url);
    }
  }, 800);
};

const GetUrlsFromString = (str: string) => {
  let urlRegex = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g;
  const urls = str.match(urlRegex)
  return urls
};

const parseWebsiteUrlTitle = async (url: string) => {
  if (!url) return;

  const resp = await fetch(`${serviceUrl}/${parseUrlTitileApi}?url=${url}`);
  const data = await resp.json();
  const { websiteTitle } = data;
  if (!websiteTitle) return

  let urlWithMarkdownFormat = `[${websiteTitle}](${url})`;
  updateCurrentBlockUrlFormat(url, urlWithMarkdownFormat);
};


const getBlockContent = (uid: string) => {
  return (window.roamAlphaAPI.q(`[:find (pull ?page [:block/string])
                      :where [?page :block/uid "${uid}"]  ]`)[0][0] as { string: string }).string;
};

const updateCurrentBlockUrlFormat = (url: string, urlWithMarkdownFormat: string) => {
  let uid = window.roamAlphaAPI.ui.getFocusedBlock()?.['block-uid'];
  const originalContent = getBlockContent(uid);

  // const replaceBegin = originalContent.indexOf(currentUrlFromPaste)
  // const replaceEnd = originalContent.indexOf(currentUrlFromPaste) + currentUrlFromPaste.length
  const newContent = originalContent.replace(
    url,
    urlWithMarkdownFormat
  );

  window.roamAlphaAPI.updateBlock({
    block: { uid: uid, string: newContent },
  });

  setTimeout(() => {
    let ele = document.activeElement as HTMLInputElement
    ele.setSelectionRange(
      ele.value.length,
      ele.value.length
    );
  }, 100);
}

// actions that are predefined save there state automatically (except button) underneath the id provided for the action
// custom actions can save state with extensionAPI.settings.set / get / getAll
function onunload() {
  window.removeEventListener('paste', pasteListener);
}

function onload() {
  window.addEventListener('paste', pasteListener);
}

export default {
  onload: onload,
  onunload: onunload,
}
