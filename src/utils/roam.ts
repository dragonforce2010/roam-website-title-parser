import { CONFIG } from '../config/constants';

export function getBlockContent(uid: string): string {
  return (window.roamAlphaAPI.q(`[:find (pull ?page [:block/string])
                      :where [?page :block/uid "${uid}"]  ]`)[0][0] as { string: string }).string;
}

export async function updateBlock(blockUid: string, content: string): Promise<void> {
  await window.roamAlphaAPI.updateBlock({
    block: { uid: blockUid, string: content },
  });
}

export function updateCursorPosition(): void {
  setTimeout(() => {
    const ele = document.activeElement as HTMLInputElement;
    if (ele?.setSelectionRange) {
      ele.setSelectionRange(ele.value.length, ele.value.length);
    }
  }, CONFIG.CURSOR_UPDATE_DELAY);
} 