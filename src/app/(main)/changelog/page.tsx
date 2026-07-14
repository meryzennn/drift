"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Edit3, Bug, Trash2 } from "lucide-react";
import BackButton from "@/components/BackButton";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

const SECTION_ICONS = {
  added: Plus,
  changed: Edit3,
  fixed: Bug,
  removed: Trash2,
};

const SECTION_COLORS = {
  added: "text-green-500",
  changed: "text-blue-500",
  fixed: "text-orange-500",
  removed: "text-red-500",
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lastSeenChangelogVersion");
    setLastSeenVersion(stored);

    fetch("/api/changelog")
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);

        // Mark current version as seen
        if (data.entries?.[0]?.version) {
          localStorage.setItem("lastSeenChangelogVersion", data.entries[0].version);
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent("changelogViewed"));
        }
      })
      .catch((err) => {
        console.error("Failed to load changelog:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xl">
        <div className="text-on-surface-variant">Loading changelog...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg pb-lg">
      <div className="sticky top-16 z-10 bg-background py-md border-b border-outline-variant">
        <div className="flex items-center gap-sm mb-xs">
          <BackButton />
          <h1 className="text-2xl font-bold text-on-surface">What&apos;s New</h1>
        </div>
        <p className="text-sm text-on-surface-variant mt-xs">Track updates and improvements to Drift</p>
      </div>

      <div className="flex flex-col gap-lg font-[family-name:var(--font-jetbrains-mono)]">
        {entries.map((entry) => {
          const isNew = lastSeenVersion && compareVersions(entry.version, lastSeenVersion) > 0;

          return (
            <div
              key={entry.version}
              className="border border-outline-variant rounded-lg p-md bg-surface-container-lowest"
            >
              <div className="flex items-center gap-sm mb-md">
                <h2 className="text-xl font-bold text-on-surface">v{entry.version}</h2>
                {isNew && (
                  <span className="px-sm py-xs text-xs font-medium bg-primary text-on-primary rounded-full">
                    New
                  </span>
                )}
                <div className="flex items-center gap-xs text-sm text-on-surface-variant ml-auto">
                  <Calendar size={16} />
                  <span>{entry.date}</span>
                </div>
              </div>

              <div className="flex flex-col gap-md">
                {(Object.keys(entry.changes) as Array<keyof typeof entry.changes>).map((section) => {
                  const items = entry.changes[section];
                  if (!items || items.length === 0) return null;

                  const Icon = SECTION_ICONS[section];
                  const colorClass = SECTION_COLORS[section];

                  return (
                    <div key={section}>
                      <div className="flex items-center gap-xs mb-sm">
                        <Icon size={16} className={colorClass} />
                        <h3 className={`text-sm font-semibold capitalize ${colorClass}`}>
                          {section}
                        </h3>
                      </div>
                      <ul className="flex flex-col gap-xs pl-lg">
                        {items.map((item, idx) => (
                          <li key={idx} className="text-sm text-on-surface-variant list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
