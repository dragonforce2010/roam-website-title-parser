import { UrlTask } from '../types';
import { CONFIG } from '../config/constants';
import { parseWebsiteUrlTitle } from './urlParser';

export class QueueProcessor {
  private urlTaskQueue: UrlTask[] = [];
  private isProcessing = false;
  private processedUrls = new Set<string>();
  private timeoutIds: NodeJS.Timeout[] = [];

  async addTasks(tasks: UrlTask[]): Promise<void> {
    const newTasks = tasks.filter(task => {
      const taskKey = `${task.url}-${task.blockUid}`;
      return !this.processedUrls.has(taskKey);
    });

    if (newTasks.length === 0) return;

    this.urlTaskQueue.push(...newTasks);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      this.timeoutIds.push(setTimeout(() => this.processQueue(), CONFIG.QUEUE_RETRY_DELAY));
      return;
    }

    if (this.urlTaskQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const uniqueTasks = this.deduplicateTasks();
      this.urlTaskQueue = [];

      const results = await Promise.allSettled(
        uniqueTasks.map(task => 
          parseWebsiteUrlTitle(task.url, task.blockUid, this.processedUrls)
        )
      );

      this.handleFailedTasks(results, uniqueTasks);

    } finally {
      this.isProcessing = false;
      if (this.urlTaskQueue.length > 0) {
        this.timeoutIds.push(setTimeout(() => this.processQueue(), CONFIG.QUEUE_RETRY_DELAY));
      }
    }
  }

  private deduplicateTasks(): UrlTask[] {
    return this.urlTaskQueue.reduce((acc, current) => {
      const exists = acc.some(task => 
        task.url === current.url && task.blockUid === current.blockUid
      );
      if (!exists) acc.push(current);
      return acc;
    }, [] as UrlTask[]);
  }

  private handleFailedTasks(results: PromiseSettledResult<void>[], tasks: UrlTask[]): void {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.urlTaskQueue.push(tasks[index]);
      }
    });
  }

  cleanup(): void {
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
    this.processedUrls.clear();
    this.urlTaskQueue = [];
    this.isProcessing = false;
  }
} 