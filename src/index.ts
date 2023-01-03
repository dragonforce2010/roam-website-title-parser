import getUids from "roamjs-components/dom/getUids";
import 'roamjs-components/types'

let currentUrlFromPaste = '';
let serviceUrl = 'https://ec2-18-141-200-240.ap-southeast-1.compute.amazonaws.com'
// let serviceUrl = 'http://localhost:3000/api'

const pasteListener = (event:ClipboardEvent) => {
  const url = event.clipboardData.getData('text');
  if (!CheckUrlFormat(url)) return;

  currentUrlFromPaste = url;

  setTimeout(() => {
    parseWebsiteUrlTitle(currentUrlFromPaste);
  }, 800);
};

const CheckUrlFormat = (url: string) => {
  // const matchPattern =
    // /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+$/;
  const matchPattern = /((?!\]\().)+[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ 
  return matchPattern.test(url); // dummy
};

const parseWebsiteUrlTitle = async (url:string) => {
  if (!url) return;

  const resp = await fetch(`${serviceUrl}/parse-url-title?url=${url}`);
  const data = await resp.json();
  const { websiteTitle } = data;
  let urlWithMarkdownFormat = `[${websiteTitle}](${url})`;
  updateCurrentBlockUrlFormat(urlWithMarkdownFormat);
};


const getBlockContent = (uid:string) => {
  return (window.roamAlphaAPI.q(`[:find (pull ?page [:block/string])
                      :where [?page :block/uid "${uid}"]  ]`)[0][0] as {string: string}).string;
};

const updateCurrentBlockUrlFormat = (urlWithMarkdownFormat:string) => {
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
