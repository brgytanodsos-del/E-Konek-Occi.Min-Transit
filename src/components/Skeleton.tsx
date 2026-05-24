export const CardSkeleton = () => (
  <div className="animate-pulse bg-zinc-800 rounded-xl p-6 space-y-4">
    <div className="h-5 bg-zinc-700 rounded w-3/4"></div>
    <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
    <div className="h-10 bg-zinc-700 rounded mt-6"></div>
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="py-4"><div className="h-4 bg-zinc-700 rounded w-32"></div></td>
    <td><div className="h-4 bg-zinc-700 rounded w-40"></div></td>
    <td><div className="h-4 bg-zinc-700 rounded w-24"></div></td>
    <td><div className="h-4 bg-zinc-700 rounded w-20"></div></td>
  </tr>
);
