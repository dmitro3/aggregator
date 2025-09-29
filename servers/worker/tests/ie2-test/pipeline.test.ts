import { eq } from "drizzle-orm";
import { web3 } from "@coral-xyz/anchor";
import { beforeAll, describe, expect, test } from "bun:test";
import {
  createDB,
  getPairs,
  pairs,
  swaps,
  type Database,
} from "@rhiva-ag/datasource";

import { getEnv } from "../../src/env";
import { pipeline } from "../../src/jobs/program-log.job";

describe("Pipeline ie2 test", () => {
  let db: Database;
  let connection: web3.Connection;

  beforeAll(() => {
    db = createDB(getEnv("DATABASE_URL"));
    connection = new web3.Connection(
      "https://lb.drpc.org/solana/AjYxjROkIkIxpk0CFmpujWnsb-cZiLUR8IkpqhnKxixj",
    );
  });

  test("should pass saros program decode test", async () => {
    const signature =
      "4E3ctPSnfRpurAicLSmrR7ba5azs5sXgWZgGJc2KSq1dw4zZ7rqrkJpzQs94y6Ep4wsTGE6m5yb6rfo6MHeS62e9";
    const parsedTransaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (parsedTransaction) {
      await pipeline.process(parsedTransaction);

      const [pair] = await getPairs(
        db,
        eq(pairs.id, "9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk"),
      );

      expect(pair).not.toBeUndefined();
      expect(pair.binStep).toEqual(1);
      expect(pair.baseFee).toEqual(0.01);
      expect(pair.protocolFee).toEqual(0.002);
      expect(pair.dynamicFee).toBeGreaterThanOrEqual(0.001);
      expect(pair.baseMint.id).toEqual(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );
      expect(pair.quoteMint.id).toEqual(
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      );
      expect(pair.liquidity).toBeGreaterThanOrEqual(450_810);

      const swap = await db.query.swaps.findFirst({
        where: eq(swaps.signature, signature),
      });

      expect(swap).not.toBeUndefined();
      expect(swap!.type).toBe("sell");
      expect(swap!.signature).toBe(signature);
      expect(swap!.fee).toBe(81_574 / Math.pow(10, 6));
      expect(swap!.baseAmount).toBe(815_734_551 / Math.pow(10, 6));
      expect(swap!.quoteAmount).toBe(815_082_248 / Math.pow(10, 6));
    }
  });

  test("should pass raydium program decode test", async () => {
    const signature =
      "5erb7L544AbGZVzoVAH7PJX7QUuQxSrhtP1dSMxiC7ANPfYJU3gEcD23XcTAVq7uFpUviBXArQKyvtiVur39zfpg";
    const parsedTransaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (parsedTransaction) {
      await pipeline.process(parsedTransaction);

      const [pair] = await getPairs(
        db,
        eq(pairs.id, "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv"),
      );

      expect(pair).not.toBeUndefined();
      expect(pair.binStep).toEqual(1);
      expect(pair.baseFee).toEqual(0.04);
      expect(pair.dynamicFee).toBe(0);
      expect(pair.protocolFee).toEqual(0.04 * 0.12);
      expect(pair.baseMint.id).toEqual(
        "So11111111111111111111111111111111111111112",
      );
      expect(pair.quoteMint.id).toEqual(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );
      expect(14_771_887 - pair.liquidity).toBeGreaterThanOrEqual(-1000);

      const swap = await db.query.swaps.findFirst({
        where: eq(swaps.signature, signature),
      });

      expect(swap).not.toBeUndefined();
      expect(swap!.type).toBe("buy");
      expect(swap!.signature).toBe(signature);
      expect(swap!.fee).toBe(0);
      expect(swap!.baseAmount).toBe(11_197_953_656 / Math.pow(10, 9));
      expect(swap!.quoteAmount).toBe(2_269_84_9829 / Math.pow(10, 6));
    }
  });

  test("should pass meteora program decode test", async () => {
    const signature =
      "4cejDWUtSt7LJDkVmor1jDwQxgvqJYVV249RBsJskz1UwCDJ7nGjkaqQS8uybv9DzNhW1TeQ4HBCurwiixZEiyHF";
    const parsedTransaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (parsedTransaction) {
      await pipeline.process(parsedTransaction);

      const [pair] = await getPairs(
        db,
        eq(pairs.id, "HTvjzsfX3yU6BUodCjZ5vZkUrAxMDTrBs3CJaq43ashR"),
      );

      expect(pair).not.toBeUndefined();
      expect(pair.binStep).toEqual(1);
      expect(pair.baseFee).toEqual(0.01);
      expect(pair.dynamicFee).toBeGreaterThanOrEqual(0.01);
      expect(pair.protocolFee).toBeGreaterThanOrEqual(0.01);
      expect(pair.baseMint.id).toEqual(
        "So11111111111111111111111111111111111111112",
      );
      expect(pair.quoteMint.id).toEqual(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );
      expect(1_677_747 - pair.liquidity).toBeGreaterThanOrEqual(-1000);

      const swap = await db.query.swaps.findFirst({
        where: eq(swaps.signature, signature),
      });

      expect(swap).not.toBeUndefined();
      expect(swap!.type).toBe("buy");
      expect(swap!.signature).toBe(signature);
      expect(swap!.fee).toBe(0.175044);
      expect(swap!.baseAmount).toBe(8_557_026_233 / Math.pow(10, 9));
      expect(swap!.quoteAmount).toBe(1_734_004_546 / Math.pow(10, 6));
    }
  });

  test("should pass orca program decode test", async () => {
    const signature =
      "3jZoHuNhxdiZfzNzY6xJTWpZd7997q8ruVA6Z3j66t33SkiowrakQLHrnvJhmHZs5giMqpGMJcSNcCMNe72LquG4";
    const parsedTransaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (parsedTransaction) {
      await pipeline.process(parsedTransaction);

      const [pair] = await getPairs(
        db,
        eq(pairs.id, "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"),
      );

      expect(pair).not.toBeUndefined();
      expect(pair.binStep).toEqual(4);
      expect(pair.baseFee).toEqual(0.0004);
      expect(pair.dynamicFee).toBeGreaterThanOrEqual(0);
      expect(pair.protocolFee).toBeGreaterThanOrEqual(0.00005);
      expect(pair.baseMint.id).toEqual(
        "So11111111111111111111111111111111111111112",
      );
      expect(pair.quoteMint.id).toEqual(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );
      expect(52_964_464 - pair.liquidity).toBeGreaterThanOrEqual(-1000);

      const swap = await db.query.swaps.findFirst({
        where: eq(swaps.signature, signature),
      });

      expect(swap).not.toBeUndefined();
      expect(swap!.type).toBe("buy");
      expect(swap!.signature).toBe(signature);
      expect(swap!.fee).toBe(1.2615);
      expect(swap!.baseAmount).toBe(17_859_112_945 / Math.pow(10, 9));
      expect(swap!.quoteAmount).toBe(3_625_000_000 / Math.pow(10, 6));
    }
  });
});
