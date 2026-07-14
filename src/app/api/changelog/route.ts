import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const changelogPath = join(process.cwd(), "CHANGELOG.md");
    const content = readFileSync(changelogPath, "utf-8");

    const entries: ChangelogEntry[] = [];
    const lines = content.split("\n");

    let currentEntry: ChangelogEntry | null = null;
    let currentSection: "added" | "changed" | "fixed" | "removed" | null = null;

    for (const line of lines) {
      // Match version headers: ## [1.5.0] - 2026-07-14
      const versionMatch = line.match(/^##\s+\[(.+?)\]\s+-\s+(.+?)$/);
      if (versionMatch) {
        if (currentEntry) entries.push(currentEntry);
        currentEntry = {
          version: versionMatch[1],
          date: versionMatch[2],
          changes: {},
        };
        currentSection = null;
        continue;
      }

      // Match section headers: ### Added
      const sectionMatch = line.match(/^###\s+(Added|Changed|Fixed|Removed)$/i);
      if (sectionMatch && currentEntry) {
        currentSection = sectionMatch[1].toLowerCase() as "added" | "changed" | "fixed" | "removed";
        if (!currentEntry.changes[currentSection]) {
          currentEntry.changes[currentSection] = [];
        }
        continue;
      }

      // Match list items: - Item text
      const itemMatch = line.match(/^-\s+(.+)$/);
      if (itemMatch && currentEntry && currentSection) {
        currentEntry.changes[currentSection]?.push(itemMatch[1]);
      }
    }

    if (currentEntry) entries.push(currentEntry);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to parse changelog:", error);
    return NextResponse.json({ entries: [] }, { status: 500 });
  }
}
