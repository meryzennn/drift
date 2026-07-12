import { format, formatDistanceToNow } from "date-fns";

export interface FormattedDate {
  text: string;
  useSpaceGrotesk: boolean;
}

export function getFormattedDate(dateInput: string | Date): FormattedDate {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffInMs = Date.now() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return {
      text: formatDistanceToNow(date),
      useSpaceGrotesk: false,
    };
  } else {
    // EEEE = Day of week (e.g., Monday)
    // MMM = Month (e.g., Jul)
    // d = Day (e.g., 12)
    // yyyy = Year (e.g., 2026)
    return {
      text: format(date, "EEEE, MMM d, yyyy"),
      useSpaceGrotesk: true,
    };
  }
}
