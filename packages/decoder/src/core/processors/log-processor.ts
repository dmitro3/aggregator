import { Consumer } from "./consumer";

export abstract class LogProcessor<T> extends Consumer<
  (...events: T[]) => Promise<void>
> {
  abstract process(logs?: string[]): T[] | null;
}
