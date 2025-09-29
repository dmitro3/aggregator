import z from "zod";

export type Value = string | number | Date | Array<Value>;

type WhereShallowOperator<T extends Value> = {
  eq?: T;
  like?: T;
  ilike?: T;
  gte?: T;
  lte?: T;
  gt?: T;
  lt?: T;
  isNull?: undefined;
  isNotNull?: undefined;
};

export type WhereRecursiveOperator<T> = {
  ne?: T extends Value
    ? (WhereShallowOperator<T> | WhereArrayOperator<T>)[] | T
    : T | WhereRecursiveOperator<T>;
  or?: T extends Value
    ? (WhereShallowOperator<T> | WhereArrayOperator<T>)[] | T
    : T | WhereRecursiveOperator<T>;
  and?: T extends Value
    ? (WhereShallowOperator<T> | WhereArrayOperator<T>)[] | T
    : T | WhereRecursiveOperator<T>;
};

type WhereArrayOperator<T extends Value> = {
  inArray?: T[];
  notInArray?: T[];
  arrayContains?: T[];
  arrayContained?: T[];
};

export type Operator<T extends Value> =
  | WhereShallowOperator<T>
  | {
      ne?: Omit<Operator<T>, "ne"> | T;
      or?: Omit<Operator<T>, "or">[] | T;
      and?: Omit<Operator<T>, "and">[] | T;
    }
  | WhereArrayOperator<T>
  | { isNull?: undefined; isNotNull?: undefined };

export type FlattenedOperator<
  T extends Operator<Value>,
  P extends unknown[] = [],
> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? U extends Operator<Value>
      ? [FlattenedOperator<U, [...P, K]>]
      : [[...P, K], T[K] extends unknown & infer R ? R : never]
    : T[K] extends Operator<Value>
      ? FlattenedOperator<T[K], [...P, K]>
      : [[...P, K], T[K]];
}[keyof T];

export const whereOperator = <T extends Value>(
  valueSchema: z.ZodType<T>,
): z.ZodType<Operator<T>> =>
  z.lazy(() =>
    z.union([
      z.partialRecord(
        z.enum(["eq", "ilike", "like", "lte", "gte", "lt", "gt"]),
        valueSchema.optional(),
      ),
      z.partialRecord(
        z.enum(["isNull", "isNotNull"]),
        z.undefined().optional(),
      ),
      z.partialRecord(z.enum(["ne"]), whereOperator(valueSchema)),
      z.partialRecord(
        z.enum(["or", "and"]),
        z.array(whereOperator(valueSchema).or(valueSchema)),
      ),
      z.partialRecord(
        z.enum(["inArray", "notInArray", "arrayContains", "arrayContained"]),
        z.array(valueSchema).optional(),
      ),
    ]),
  );

export type OrderByOperator = {
  [key: string]: "desc" | "asc";
};

export const orderByOperator = <T extends z.ZodEnum>(key: T) =>
  z.union([z.partialRecord(key, z.enum(["desc", "asc"])), z.array(key)]);
