export class Consumer<T extends (...args: any) => any> {
  private readonly consumers: T[];

  constructor() {
    this.consumers = [];
  }

  readonly addConsumer = (fn: T) => {
    this.consumers.push(fn);
    return this;
  };

  consume(...args: Parameters<T>) {
    for (const consumer of this.consumers) consumer(...args);
  }
}
