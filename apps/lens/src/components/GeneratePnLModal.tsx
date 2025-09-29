import { z } from "zod/mini";
import { useRef, useState } from "react";
import { object, string } from "yup";
import { MdClose } from "react-icons/md";
import type { pnlSchema } from "@rhiva-ag/trpc";
import { ErrorMessage, Form, Formik } from "formik";
import {
  Dialog,
  DialogPanel,
  DialogBackdrop,
  DialogTitle,
} from "@headlessui/react";

import PnLCard from "./PnLCard";
import { useTRPCClient } from "../trpc.client";
import clsx from "clsx";

export default function GeneratePnLModal(
  props: React.ComponentProps<typeof Dialog>,
) {
  const trpc = useTRPCClient();
  const isPastingRef = useRef(false);
  const [pnl, setPNL] = useState<z.infer<typeof pnlSchema> | null>(null);

  return (
    <Dialog
      as="div"
      {...props}
      className="relative focus:outline-none"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/80 duration ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex flex-col items-center justify-center">
        <DialogPanel
          transition
          className="w-sm flex flex-col space-y-4 bg-white/3 backdrop-blur-3xl p-4 rounded-md duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <header className="flex items-center">
            <DialogTitle className="text-xl font-bold">
              Generate PnL Card
            </DialogTitle>
            <button
              type="button"
              onClick={() => props.onClose(true)}
              className="ml-auto border border-white/70"
            >
              <MdClose
                size={24}
                className="text-white/70"
              />
            </button>
          </header>
          <section className="flex flex-col space-y-4">
            <div className="bg-sky-700/20 p-2 rounded-md">
              <p className="text-sky">
                Paste a DLMM tx for opening, claiming, or closing a position.
                Supported Links include Solscan, SolBeach, SolExplorer,
                SolanaFM, OKLink and tx IDs.
              </p>
            </div>
            <Formik
              validateOnMount
              validationSchema={object({
                signature: string().min(88, "Invalid tx id."),
              })}
              initialValues={{
                signature: "",
              }}
              onSubmit={async (values, { setFieldError }) =>
                trpc.pnl.retrieve
                  .query({ ...values, market: "saros" })
                  .then((value) => {
                    if (value) setPNL(value);
                    else
                      setFieldError(
                        "signature",
                        "We can't parse transaction of this type.",
                      );
                  })
              }
            >
              {({
                values,
                isSubmitting,
                errors,
                touched,
                isValid,
                setFieldValue,
                setFieldError,
                setFieldTouched,
              }) => (
                <Form className="flex flex-col space-y-8">
                  <div className="flex flex-col space-y-2">
                    <p className="text-gray">Put your transaction here</p>
                    <div className="flex flex-col">
                      <input
                        name="signature"
                        value={values.signature}
                        autoComplete="off"
                        className={clsx(
                          "bg-transparent p-2 bg-white/3 border-1 border-gray/20 rounded-md focus:border-primary",
                          touched.signature && errors.signature && "error",
                        )}
                        onChange={(event) => {
                          if (isPastingRef.current) return;
                          setFieldTouched("signature", true, false);
                          setFieldValue("signature", event.target.value, true);
                        }}
                        onPaste={(
                          event: React.ClipboardEvent<HTMLInputElement>,
                        ) => {
                          event.preventDefault();
                          isPastingRef.current = true;
                          const pasted = event.clipboardData.getData("text");

                          if (z.url().safeParse(pasted).success) {
                            const parts = pasted.split(/\//);
                            const txId = parts[parts.length - 1];
                            if (txId.length >= 88)
                              setFieldValue("signature", txId, true);
                            else
                              setFieldError(
                                "signature",
                                "Unsupported link type",
                              );
                          } else setFieldValue("signature", pasted, true);

                          isPastingRef.current = false;
                        }}
                      />
                      <ErrorMessage
                        component="small"
                        name="signature"
                        className="text-red-500"
                      />
                    </div>
                  </div>
                  {pnl && <PnLCard pnl={pnl} />}
                  <button
                    type="submit"
                    className={clsx(
                      "rounded-md",
                      isValid
                        ? "bg-primary text-black"
                        : "bg-primary/50 text-black",
                    )}
                  >
                    {isSubmitting ? (
                      <div className="m-auto my-2.5 size-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <p className="p-3">Generate</p>
                    )}
                  </button>
                </Form>
              )}
            </Formik>
          </section>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
