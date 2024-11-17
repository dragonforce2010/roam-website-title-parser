export interface ParseResponse {
  websiteTitle: string;
  error?: string;
}

export interface UrlTask {
  url: string;
  blockUid: string;
}

export interface BlockObservers {
  [key: string]: MutationObserver;
} 