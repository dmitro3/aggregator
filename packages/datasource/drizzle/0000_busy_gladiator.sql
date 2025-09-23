CREATE TABLE "mints" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"symbol" text,
	"decimals" integer NOT NULL,
	"extra" jsonb NOT NULL,
	"tokenProgram" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"syncAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"extra" jsonb NOT NULL,
	"quoteMint" text NOT NULL,
	"baseMint" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"market" text NOT NULL,
	"syncAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swaps" (
	"signature" text,
	"extra" jsonb NOT NULL,
	"pair" text NOT NULL,
	"feeUsd" integer NOT NULL,
	"baseAmountUsd" integer NOT NULL,
	"quoteAmountUsd" integer NOT NULL,
	"fee" bigint NOT NULL,
	"baseAmount" bigint NOT NULL,
	"quoteAmount" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "swaps_signature_pair_unique" UNIQUE("signature","pair")
);
--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_quoteMint_mints_id_fk" FOREIGN KEY ("quoteMint") REFERENCES "public"."mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_baseMint_mints_id_fk" FOREIGN KEY ("baseMint") REFERENCES "public"."mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swaps" ADD CONSTRAINT "swaps_pair_pairs_id_fk" FOREIGN KEY ("pair") REFERENCES "public"."pairs"("id") ON DELETE cascade ON UPDATE no action;