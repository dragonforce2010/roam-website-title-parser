import '../types';
import { QueueProcessor } from './services/queueProcessor';
import { CONFIG } from './config/constants';
import { GetUrlsFromString } from './utils/url';
import { getBlockContent } from './utils/roam';
import { BlockObservers } from './types';

class RoamUrlParser {
  private queueProcessor: QueueProcessor;
  private blockObservers: BlockObservers;
  private pasteHandler: (event: ClipboardEvent) => Promise<void>;
  private enterHandler: (event: KeyboardEvent) => Promise<void>;

  constructor() {
    this.queueProcessor = new QueueProcessor();
    this.blockObservers = {};
    this.pasteHandler = this.handlePaste.bind(this);
    this.enterHandler = this.handleEnterKey.bind(this);
  }

  private observeBlock(blockUid: string): void {
    if (this.blockObservers[blockUid]) return;

    const targetNode = document.querySelector(`[id*="${blockUid}"]`);
    if (!targetNode) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          const content = getBlockContent(blockUid);
          const urls = GetUrlsFromString(content);
          if (urls && urls.length > 0) {
            this.queueProcessor.addTasks(
              urls.map(url => ({ url, blockUid }))
            );
          }
        }
      });
    });

    observer.observe(targetNode, {
      childList: true,
      characterData: true,
      subtree: true
    });

    this.blockObservers[blockUid] = observer;

    setTimeout(() => {
      if (this.blockObservers[blockUid]) {
        this.blockObservers[blockUid].disconnect();
        delete this.blockObservers[blockUid];
      }
    }, CONFIG.OBSERVER_TIMEOUT);
  }

  private async handleEnterKey(event: KeyboardEvent): Promise<void> {
    if (event.key !== 'Enter') return;

    const currentBlock = window.roamAlphaAPI.ui.getFocusedBlock();
    if (!currentBlock) return;

    const currentBlockUid = currentBlock['block-uid'];
    const content = getBlockContent(currentBlockUid);
    
    const urls = GetUrlsFromString(content);
    if (!urls || urls.length === 0) return;

    await this.queueProcessor.addTasks(
      urls.map(url => ({ url, blockUid: currentBlockUid }))
    );
  }

  private async handlePaste(event: ClipboardEvent): Promise<void> {
    const pasteContent = event.clipboardData.getData('text');
    const urls = GetUrlsFromString(pasteContent);
    if (!urls || urls.length === 0) return;

    const currentBlock = window.roamAlphaAPI.ui.getFocusedBlock();
    if (!currentBlock) return;

    const blockUid = currentBlock['block-uid'];
    this.observeBlock(blockUid);

    let attempts = 0;
    const checkContent = async () => {
      while (attempts < CONFIG.MAX_CHECK_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        
        const currentContent = getBlockContent(blockUid);
        const urlsInBlock = urls.filter(url => currentContent.includes(url));
        
        if (urlsInBlock.length > 0) {
          await this.queueProcessor.addTasks(
            urlsInBlock.map(url => ({ url, blockUid }))
          );
        }

        attempts++;
      }
    };

    checkContent();
    setTimeout(() => checkContent(), 500);
    setTimeout(() => checkContent(), 1000);
  }

  private cleanup(): void {
    Object.values(this.blockObservers).forEach(observer => observer.disconnect());
    this.blockObservers = {};
    this.queueProcessor.cleanup();
  }

  public initialize(): void {
    window.addEventListener('paste', this.pasteHandler);
    window.addEventListener('keydown', this.enterHandler);
  }

  public unload(): void {
    window.removeEventListener('paste', this.pasteHandler);
    window.removeEventListener('keydown', this.enterHandler);
    this.cleanup();
  }
}

let instance: RoamUrlParser | null = null;

export default {
  onload: () => {
    if (!instance) {
      instance = new RoamUrlParser();
      instance.initialize();
    }
  },
  onunload: () => {
    if (instance) {
      instance.unload();
      instance = null;
    }
  },
};
