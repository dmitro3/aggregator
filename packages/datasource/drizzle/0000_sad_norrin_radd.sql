CREATE TABLE "mints" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"symbol" text,
	"decimals" integer NOT NULL,
	"extra" jsonb NOT NULL,
	"tokenProgram" text NOT NULL,
	"syncAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"extra" jsonb NOT NULL,
	"quoteMint" text NOT NULL,
	"baseMint" text NOT NULL,
	"binStep" numeric NOT NULL,
	"baseFee" numeric NOT NULL,
	"maxFee" numeric NOT NULL,
	"protocolFee" numeric NOT NULL,
	"dynamicFee" numeric NOT NULL,
	"liquidity" numeric NOT NULL,
	"baseReserveAmount" numeric NOT NULL,
	"quoteReserveAmount" numeric NOT NULL,
	"baseReserveAmountUsd" numeric NOT NULL,
	"quoteReserveAmountUsd" numeric NOT NULL,
	"syncAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"market" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swaps" (
	"signature" text,
	"extra" jsonb NOT NULL,
	"type" text NOT NULL,
	"pair" text NOT NULL,
	"feeUsd" numeric NOT NULL,
	"baseAmountUsd" numeric NOT NULL,
	"quoteAmountUsd" numeric NOT NULL,
	"fee" numeric NOT NULL,
	"baseAmount" numeric NOT NULL,
	"quoteAmount" numeric NOT NULL,
	"tvl" numeric,
	"price" numeric,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewardMints" (
	"pair" text NOT NULL,
	"mint" text NOT NULL,
	CONSTRAINT "rewardMints_pair_mint_unique" UNIQUE NULLS NOT DISTINCT("pair","mint")
);
--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_quoteMint_mints_id_fk" FOREIGN KEY ("quoteMint") REFERENCES "public"."mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_baseMint_mints_id_fk" FOREIGN KEY ("baseMint") REFERENCES "public"."mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_pair_pairs_id_fk" FOREIGN KEY ("pair") REFERENCES "public"."pairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewardMints" ADD CONSTRAINT "rewardMints_pair_pairs_id_fk" FOREIGN KEY ("pair") REFERENCES "public"."pairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewardMints" ADD CONSTRAINT "rewardMints_mint_mints_id_fk" FOREIGN KEY ("mint") REFERENCES "public"."mints"("id") ON DELETE cascade ON UPDATE no action;