import { Workspace } from "@/components/workspace";

/**
 * The only page.
 *
 * It renders one client component and nothing else. There is no data to load here: what the
 * host is holding is fetched in the browser, from this application's own route handler, so
 * that a reload shows the current truth rather than whatever was true when the server
 * rendered.
 *
 * @returns The page.
 */
export default function Page() {
  return (
    <div className="h-full">
      <Workspace />
    </div>
  );
}
