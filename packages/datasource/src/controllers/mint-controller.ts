import xior from "xior";
import assert from "assert";
import { format } from "util";
import mime from "mime-types";
import type { z } from "zod/mini";
import { inArray } from "drizzle-orm";
import type { PublicKey, Umi } from "@metaplex-foundation/umi";
import { fetchAllDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";

import {
  mints,
  type mintSelectSchema,
  type Database,
  metadataSchema,
} from "../db";

export const upsertMint = async (
  db: Database,
  umi: Umi,
  ...mintIds: string[]
) => {
  const existingMints = await db.query.mints
    .findMany({
      where: inArray(mints.id, mintIds),
    })
    .execute();

  const nonExistingMints = mintIds.filter(
    (mintId) => !existingMints.some((mint) => mint.id === mintId),
  ) as PublicKey[];

  const assets = await fetchAllDigitalAsset(umi, nonExistingMints);

  assert(
    assets.length === nonExistingMints.length,
    format("missing %d mints", assets.length - nonExistingMints.length),
  );

  const values = await Promise.all(
    assets.map(async (asset) => {
      const mimeType = mime.lookup(asset.metadata.uri);
      let metadata: Partial<z.infer<typeof metadataSchema>> | undefined;

      if (mimeType && /^image/.test(mimeType))
        metadata = { image: asset.metadata.uri };

      const response = await xior.get(asset.metadata.uri).catch(() => null);
      metadata = response?.data;

      return {
        id: asset.mint.publicKey,
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        decimals: asset.mint.decimals,
        tokenProgram: asset.mint.header.owner,
        extra: {
          uri: asset.metadata.uri,
          metadata: metadataSchema.safeParse(metadata).data,
        },
      };
    }),
  );

  let createdMints: z.infer<typeof mintSelectSchema>[] = [];

  if (values.length > 0) {
    createdMints = await db.insert(mints).values(values).returning().execute();
  }

  return [...existingMints, ...createdMints];
};
