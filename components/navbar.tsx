"use client";

/**
 * Navbar — alias na `<SideNav>` (lewy sidebar). Stary gorny header zostal
 * zastapiony lewa nawigacja, ale wszystkie strony nadal importuja
 * `<Navbar>` — eksportujemy alias zeby uniknac edycji kazdej strony.
 *
 * Jezeli potrzebujesz nowych zachowan, edytuj `components/side-nav.tsx`.
 */

export { SideNav as Navbar } from "@/components/side-nav";
