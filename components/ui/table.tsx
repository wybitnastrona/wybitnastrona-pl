"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal shadcn-style table primitives - wrappery na natywne <table> ze
 * spójnym stylowaniem (border-beige/15, hover, padding).
 *
 * Użycie:
 *   <Table>
 *     <TableHeader>
 *       <TableRow><TableHead>Col</TableHead></TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       <TableRow><TableCell>Val</TableCell></TableRow>
 *     </TableBody>
 *   </Table>
 */
export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn(
          "w-full caption-bottom border-collapse text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-beige/15 bg-card/40 [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-beige/10 transition-colors hover:bg-white/[0.02] data-[state=selected]:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 whitespace-nowrap px-3 text-left align-middle text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-top text-xs text-foreground/90",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("mt-3 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
