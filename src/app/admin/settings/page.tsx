import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = {
  title: "Settings — Admin",
  robots: { index: false, follow: false },
};

// Force dynamic so each visit reflects the current state of settings.json
// in the content repo, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-8 font-mono text-xs uppercase tracking-widest text-primary">
        {"// Settings"}
      </h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
