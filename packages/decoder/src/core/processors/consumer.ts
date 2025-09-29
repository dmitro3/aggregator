export class Consumer<T extends (...args: any) => any> {
  private readonly consumers: T[];

  constructor() {
    this.consumers = [];
  }

  readonly addConsumer = (fn: T) => {
    this.consumers.push(fn);
    return this;
  };

  async consume(...args: Parameters<T>) {
    return Promise.all(
      this.consumers.map(async (consumer) => await consumer(...args)),
    );
  }
}
