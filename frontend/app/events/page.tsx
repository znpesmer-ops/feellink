import EventsPageClient, { type EventsTab } from "./EventsPageClient";

export const dynamic = "force-dynamic";

function parseInitialTab(tab: string | string[] | undefined): EventsTab {
  const v = Array.isArray(tab) ? tab[0] : tab;
  if (v === "mine" || v === "requested" || v === "approved" || v === "all") {
    return v;
  }
  return "all";
}

export default function EventsPage({
  searchParams,
}: {
  searchParams: { tab?: string | string[] };
}) {
  const initialTab = parseInitialTab(searchParams?.tab);
  return <EventsPageClient initialTab={initialTab} />;
}
