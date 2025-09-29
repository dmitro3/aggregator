import { ApiImpl } from "../api-impl";
import type { Pair } from "./models";

type PairArgs = {
  page?: number;
  limit?: number;
  tags?: string[];
  skip_size?: number;
  sort_key?:
    | "tvl"
    | "volume"
    | "feetvlratio"
    | "lm"
    | "feetvlratio30m"
    | "feetvlratio1h"
    | "feetvlratio2h"
    | "feetvlratio4h"
    | "feetvlratio12h"
    | "volume30m"
    | "volume1h"
    | "volume2h"
    | "volume4h"
    | "volume12h";
  order_by?: "asc" | "desc";
  search_term?: string;
  hide_low_tvl?: boolean;
  hide_low_apr?: boolean;
  pools_to_top?: string[];
  include_unknown?: boolean;
  include_token_mints?: string[];
  include_pool_token_pairs?: string[];
};

export class PairApi extends ApiImpl {
  protected path: string = "pair";

  getPair(pair: string) {
    return ApiImpl.getData(this.xior.get<Pair>(this.buildPath(pair)));
  }

  allByGroups(args?: PairArgs) {
    return ApiImpl.getData(
      this.xior.get<{ groups: { name: string; pairs: Pair[] }[] }>(
        this.buildPathWithQueryString(this.buildPath("all_by_groups"), args),
      ),
    );
  }

  async allWithPagination(args?: PairArgs) {
    return ApiImpl.getData(
      this.xior.get<{ pairs: Pair[]; total: number }>(
        this.buildPathWithQueryString(
          this.buildPath("all_with_pagination"),
          args,
        ),
      ),
    );
  }
}
