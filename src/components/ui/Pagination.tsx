import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number | null;
  basePath: string;
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  basePath,
  searchParams = {},
}: PaginationProps) {
  if (!totalCount || totalCount <= pageSize) return null;

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (!value || key === "page") return;
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    });

    params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:justify-between sm:text-sm">
      <p className="text-slate-500">
        Showing <span className="font-medium">{from}</span>–
        <span className="font-medium">{to}</span> of{" "}
        <span className="font-medium">{totalCount}</span>
      </p>

      <div className="inline-flex items-center gap-2">
        <Link
          href={buildHref(currentPage - 1)}
          aria-disabled={currentPage === 1}
          className={`rounded-full border px-3 py-1 text-xs sm:text-sm ${
            currentPage === 1
              ? "cursor-not-allowed border-slate-200 text-slate-300"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Previous
        </Link>

        <span className="text-slate-500">
          Page <span className="font-medium">{currentPage}</span> of{" "}
          <span className="font-medium">{totalPages}</span>
        </span>

        <Link
          href={buildHref(currentPage + 1)}
          aria-disabled={currentPage === totalPages}
          className={`rounded-full border px-3 py-1 text-xs sm:text-sm ${
            currentPage === totalPages
              ? "cursor-not-allowed border-slate-200 text-slate-300"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
