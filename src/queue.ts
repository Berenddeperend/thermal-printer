type Job<T> = {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export class PrintQueue {
  private jobs: Job<unknown>[] = [];
  private processing = false;

  get depth(): number {
    return this.jobs.length;
  }

  enqueue<T>(work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.jobs.push({ work, resolve, reject } as Job<unknown>);
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift()!;
      try {
        const result = await job.work();
        job.resolve(result);
      } catch (err) {
        job.reject(err);
      }
    }

    this.processing = false;
  }
}
