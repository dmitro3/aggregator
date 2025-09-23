import { Consumer } from "./consumer";

export abstract class LogProcessor<T> extends Consumer<
  (events: T[], extra: { signature: string }) => Promise<void>
> {
  type: "log" = "log";

  abstract process(logs?: string[]): T[] | null;
}
