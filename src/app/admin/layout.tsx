import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -mt-16">
      <AdminNav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        {children}
      </div>
    </div>
  );
}
