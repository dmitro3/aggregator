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
    decimal: number;
    image: string;
  };
  tokenY: {
    address: string;
    mintAddress: string;
    name: string;
    symbol: string;
    decimal: number;
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
