// import type z from "zod";
// import {
//   and,
//   arrayContained,
//   arrayContains,
//   Column,
//   eq,
//   gt,
//   gte,
//   ilike,
//   inArray,
//   isNotNull,
//   isNull,
//   like,
//   lt,
//   lte,
//   not,
//   notInArray,
//   or,
//   sql,
//   SQL,
// } from "drizzle-orm";

// import { type Operator, type Value } from "./zod-query";

// export const mapOperators = {
//   eq,
//   gt,
//   lt,
//   gte,
//   lte,
//   like,
//   ilike,
// };

// const nestedOperators = {
//   and,
//   or,
// };

// // export const createQuerySchema =
// //   <T extends z.ZodType<Operator<Value>>>(schema: T) =>
// //   (value: z.infer<T>) => {
// //     const data = schema.parse(value);
// //     {
// //       const query: (SQL<unknown> | undefined)[] = [];

// //       const getOperatorsAndValue = (name: SQL<unknown>, operator: Operator<Value>) => {
// //         if (Array.isArray(operator)) {
// //         }

// //         for (const [opName, value] of Object.entries(operator)) {
// //           if (Array.isArray(value)) {
// //             const [first] = value;
// //             if (typeof first === "object") {
// //               const innerClauses: SQL<unknown>[] = [];

// //               for (const innerValue of value) {
// //                 const [x] = getOperatorsAndValue(name, innerValue);
// //               }

// //               const op =
// //                 nestedOperators[opName as keyof typeof nestedOperators];
// //               query.push(op(...innerClauses));
// //             } else {
// //               const op = mapOperators[opName as keyof typeof mapOperators];
// //               query.push(op(name,value ))
// //             }
// //           }
// //         }
// //       };
// //     }
// //   };
