let currentUrlFromPaste = '';
let serviceUrl = 'https://ec2-18-141-200-240.ap-southeast-1.compute.amazonaws.com'

const pasteListener = (event) => {
  const url = event.clipboardData.getData('text');
  if (!CheckUrlFormat(url)) return;

  currentUrlFromPaste = url;

  setTimeout(() => {
    parseWebsiteUrlTitle(currentUrlFromPaste);
  }, 800);
};

const CheckUrlFormat = (url) => {
  const matchPattern =
    /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+$/;
  return matchPattern.test(url); // dummy
};

const parseWebsiteUrlTitle = async (url) => {
  if (!url) return;

  const resp = await fetch(`${serviceUrl}/parseWebsiteTitleFromUrl?url=${url}`);
  const data = await resp.json();
  const { websiteTitle } = data;
  let urlWithMarkdownFormat = `[${websiteTitle}](${url})`;
  updateCurrentBlockUrlFormat(urlWithMarkdownFormat);
};


const getBlockContent = (uid) => {
  return window.roamAlphaAPI.q(`[:find (pull ?page [:block/string])
                      :where [?page :block/uid "${uid}"]  ]`)[0][0].string;
};

const updateCurrentBlockUrlFormat = (urlWithMarkdownFormat) => {
  let uid = window.roamAlphaAPI.ui.getFocusedBlock()?.['block-uid'];
  const originalContent = getBlockContent(uid);

  // const replaceBegin = originalContent.indexOf(currentUrlFromPaste)
  // const replaceEnd = originalContent.indexOf(currentUrlFromPaste) + currentUrlFromPaste.length
  const newContent = originalContent.replaceAll(
    currentUrlFromPaste,
    urlWithMarkdownFormat
  );

  window.roamAlphaAPI.updateBlock({
    block: { uid: uid, string: newContent },
  });

  setTimeout(() => {
    document.activeElement.setSelectionRange(
      document.activeElement.value.length,
      document.activeElement.value.length
    );
  }, 100);

// actions that are predefined save there state automatically (except button) underneath the id provided for the action
// custom actions can save state with extensionAPI.settings.set / get / getAll
function onunload() {
  window.removeEventListener('paste', pasteListener);
}

function onload({ extensionAPI, ...rest }) {
  window.addEventListener('paste', pasteListener);
}

export default {
  onload: onload,
  onunload: onunload,
};
