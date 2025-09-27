import { MdSearch } from "react-icons/md";

export default function Search() {
  return (
    <div className="flex items-center space-x-2 border border-white/10 rounded-md px-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20 group">
      <MdSearch
        size={24}
        className="text-white/50 group-focus-within:text-primary"
      />
      <input
        placeholder="Search for a pool with address and name"
        className="flex-1 py-2 bg-transparent placeholder-text-white/50 outline-none"
      />
    </div>
  );
}
