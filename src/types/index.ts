export interface UrlTask {
  url: string;
  blockUid: string;
}

export interface BlockObservers {
  [key: string]: MutationObserver;
} 