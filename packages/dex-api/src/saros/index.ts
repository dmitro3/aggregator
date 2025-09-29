import xior, { type XiorInstance } from "xior";
import { PoolApi } from "./pool.api";

export class SarosApi {
  private readonly xior: XiorInstance;

  readonly pool: PoolApi;

  constructor(baseURL: string) {
    this.xior = xior.create({ baseURL });

    this.pool = new PoolApi(this.xior);
  }
}
