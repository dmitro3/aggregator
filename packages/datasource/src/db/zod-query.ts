import z from "zod";

export type Value = string | number | Date | Array<Value>;

type ShallowOperator<T extends Value> = {
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

export type RecursiveOperator<T> = {
  ne?: T extends Value
    ? (ShallowOperator<T> | ArrayOperator<T>)[] | T
    : T | RecursiveOperator<T>;
  or?: T extends Value
    ? (ShallowOperator<T> | ArrayOperator<T>)[] | T
    : T | RecursiveOperator<T>;
  and?: T extends Value
    ? (ShallowOperator<T> | ArrayOperator<T>)[] | T
    : T | RecursiveOperator<T>;
};

type ArrayOperator<T extends Value> = {
  inArray?: T[];
  notInArray?: T[];
  arrayContains?: T[];
  arrayContained?: T[];
};

export type Operator<T extends Value> =
  | ShallowOperator<T>
  | {
      ne?: Omit<Operator<T>, "ne"> | T;
      or?: Omit<Operator<T>, "or">[] | T;
      and?: Omit<Operator<T>, "and">[] | T;
    }
  | ArrayOperator<T>
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

export const operator = <T extends Value>(
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
      z.partialRecord(z.enum(["ne"]), operator(valueSchema)),
      z.partialRecord(
        z.enum(["or", "and"]),
        z.array(operator(valueSchema).or(valueSchema)),
      ),
      z.partialRecord(
        z.enum(["inArray", "notInArray", "arrayContains", "arrayContained"]),
        z.array(valueSchema).optional(),
      ),
    ]),
  );
