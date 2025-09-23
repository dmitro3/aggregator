import type { SQL } from "drizzle-orm";

import type { Database } from "../db";

export const getPairs = <T extends SQL>(db: Database, where?: T) =>
  db.query.pairs
    .findMany({
      where,
      with: {
        baseMint: {
          columns: {
            id: true,
            decimals: true,
            tokenProgram: true,
          },
        },
        quoteMint: {
          columns: {
            id: true,
            decimals: true,
            tokenProgram: true,
          },
        },
      },
      columns: {
        baseMint: false,
        quoteMint: false,
      },
    })
    .execute();
