import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  className?: string; // For text alignment or fixed widths
  cell?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  expandable?: {
    expandedId: string | null;
    onExpand: (id: string) => void;
    renderExpanded: (item: T) => React.ReactNode;
  };
  keyExtractor?: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = "Belum ada data.",
  pagination,
  expandable,
  keyExtractor = (item: T) => String((item as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).id),
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startIndex = pagination ? (pagination.page - 1) * pagination.pageSize : 0;

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden flex flex-col min-h-0 flex-1 bg-card/80 backdrop-blur-sm shadow-sm">
      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
            <TableRow className="border-b-border/50">
              {columns.map((col, i) => (
                <TableHead key={i} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground animate-pulse">
                  Sedang memuat data...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {data.map((item, index) => {
                  const id = keyExtractor(item);
                  const isExpanded = expandable?.expandedId === id;
                  return (
                    <React.Fragment key={id}>
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
                        onClick={() => expandable?.onExpand(id)}
                        className={`hover:bg-muted/50 data-[state=selected]:bg-muted group transition-colors duration-200 border-b-border/30 hover:bg-accent/40 even:bg-muted/20 ${expandable ? "cursor-pointer" : ""}`}
                      >
                        {columns.map((col, i) => (
                          <TableCell key={i} className={col.className}>
                            {col.cell 
                              ? col.cell(item, startIndex + index) 
                              : col.accessorKey 
                                ? String(item[col.accessorKey] ?? "-") 
                                : null}
                          </TableCell>
                        ))}
                      </motion.tr>
                      {isExpanded && expandable?.renderExpanded && (
                        <motion.tr 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-muted/10 border-b-border/30 shadow-inner overflow-hidden"
                        >
                          <TableCell colSpan={columns.length} className="p-0 border-b-0">
                            {expandable.renderExpanded(item)}
                          </TableCell>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10 backdrop-blur-sm">
          <span className="text-sm text-muted-foreground font-medium">
            Menampilkan {startIndex + 1} hingga {Math.min(pagination.page * pagination.pageSize, pagination.total)} dari {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || isLoading}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="h-8 shadow-sm transition-transform active:scale-95"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === totalPages || isLoading}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="h-8 shadow-sm transition-transform active:scale-95"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
