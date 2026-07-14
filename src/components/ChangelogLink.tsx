"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

export default function ChangelogLink() {
  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  useEffect(() => {
    fetch("/api/changelog")
      .then((res) => res.json())
      .then((data) => {
        if (!data.entries?.[0]?.version) return;

        const latestVersion = data.entries[0].version;
        const lastSeen = localStorage.getItem("lastSeenChangelogVersion");

        if (!lastSeen || compareVersions(latestVersion, lastSeen) > 0) {
          setHasNewUpdates(true);
        }
      })
      .catch(() => {});

    // Listen for changelog viewed event
    const handleChangelogViewed = () => {
      setHasNewUpdates(false);
    };

    window.addEventListener("changelogViewed", handleChangelogViewed);

    return () => {
      window.removeEventListener("changelogViewed", handleChangelogViewed);
    };
  }, []);

  return (
    <Link
      href="/changelog"
      className="relative flex items-center gap-xs px-sm py-xs rounded-lg hover:bg-surface-container-low transition-colors"
      title="What's New"
    >
      <Megaphone size={20} className="text-on-surface-variant" />
      {hasNewUpdates && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
      )}
    </Link>
  );
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum > bNum) return 1;
    if (aNum < bNum) return -1;
  }
  return 0;
}
