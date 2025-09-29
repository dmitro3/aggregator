import xior, { type XiorInstance } from "xior";
import { PairApi } from "./pair.api";

export class MeteoraApi {
  private readonly xior: XiorInstance;

  readonly pair: PairApi;

  constructor(baseURL: string) {
    this.xior = xior.create({
      baseURL,
    });

    this.pair = new PairApi(this.xior);
  }
}
