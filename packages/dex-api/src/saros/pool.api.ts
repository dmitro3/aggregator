import { ApiImpl } from "../api-impl";
import type { Pair } from "./models/pool.model";
import type { Response } from "./models/response.model";

export class PoolApi extends ApiImpl {
  path: string = "dex-v3/pool";

  list() {
    return this.xior.get<Response<Pair[]>>(this.path);
  }

  retrieve(id: string) {
    return this.xior.get<Response<Pair>>(this.buildPath(id));
  }
}
