export type Pool = {
  pairs: Pair[];
  totalLiquidity: string;
  volume24h: string;
  fees24h: string;
  apr24h: number;
} & Pick<Pair, "tokenX" | "tokenY">;

export interface Pair {
  _id: string;
  pair: string;
  config: string;
  hook: string;
  quoteAssetBadge: string;
  binStep: number;
  binStepConfig: string;
  activeBin: number;
  tokenX: {
    address: string;
    mintAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
  };
  tokenY: {
    address: string;
    mintAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
  };
  reserveX: string;
  reserveY: string;
  totalLiquidity: string;
  liquidityDepthTokenX: string;
  liquidityDepthTokenY: string;
  protocolFeesX: string;
  protocolFeesY: string;
  baseFactor: number;
  volume24h: string;
  fees24h: string;
  apr24h: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
