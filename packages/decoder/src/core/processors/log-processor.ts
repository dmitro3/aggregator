import { Consumer } from "./consumer";

export abstract class LogProcessor<T> extends Consumer<
  (
    events: T[],
    extra: { signature: string; blockTime?: number | null },
  ) => Promise<unknown>
> {
  type: "log" = "log";

  abstract process(logs?: string[]): T[] | null;
}
