"use client";

import { Suspense } from "react";
import { RecordContent } from "@/components/admin/RecordContent";

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center pt-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-on-surface-variant border-t-primary" />
        </div>
      }
    >
      <RecordContent />
    </Suspense>
  );
}
