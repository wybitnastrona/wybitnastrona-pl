import { redirect } from "next/navigation";

/**
 * Stara strona analityki przeniesiona do modalu "Ustawienia projektu" → tab
 * "Analityka". Zachowujemy URL jako redirect zeby stare linki/zakladki dzialaly.
 */

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Analityka projektu",
};

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  redirect(`/project/${id}?settings=analytics`);
}
