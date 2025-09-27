import { MdClose } from "react-icons/md";
import {
  Dialog,
  DialogPanel,
  DialogBackdrop,
  DialogTitle,
} from "@headlessui/react";

export default function GeneratePnLModal(
  props: React.ComponentProps<typeof Dialog>,
) {
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
            <div className="bg-gray-700/20 p-2 rounded-md">
              <p className="text-gray">
                Paste a DLMM tx for opening, claiming, or closing a position.
                Supported Links include Solscan, SolBeach, SolExplorer,
                SolanaFM, OKLink and tx IDs.
              </p>
            </div>
            <div className="flex flex-col space-y-8">
              <div className="flex flex-col space-y-2">
                <p className="text-gray">Put your transaction here</p>
                <input className="bg-transparent p-2 bg-white/3 border-1 border-gray/20 rounded-md focus:border-primary" />
              </div>
              <button
                type="submit"
                className="bg-primary text-black p-3 rounded-md"
              >
                Generate
              </button>
            </div>
          </section>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
