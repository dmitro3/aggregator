import { ApiImpl } from "../api-impl";
import type { Pair, Pool } from "./models/pool.model";
import type { Response } from "./models/response.model";

export class PoolApi extends ApiImpl {
  path: string = "dex-v3/pool";

  list() {
    return ApiImpl.getData(
      this.xior.get<Response<{ data: Pool[]; page: number; total: number }>>(
        this.path,
      ),
    );
  }

  retrieve(id: string) {
    return ApiImpl.getData(this.xior.get<Response<Pair>>(this.buildPath(id)));
  }
}
