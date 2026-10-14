import {
  Megaphone,
  FileText,
  Film,
  Video,
  Radio,
  Mic,
  Mail,
  MessagesSquare,
  Handshake,
  Briefcase,
  Package,
  type LucideIcon,
} from "lucide-react";

/** Mirrors the `ListingCategory` enum in the API's Prisma schema. */
export type ListingCategory =
  | "SHOUTOUT"
  | "SPONSORED_POST"
  | "VIDEO_INTEGRATION"
  | "DEDICATED_VIDEO"
  | "LIVESTREAM"
  | "PODCAST"
  | "NEWSLETTER"
  | "AMA"
  | "COLLAB"
  | "CONSULTING"
  | "OTHER";

export interface CategoryMeta {
  value: ListingCategory;
  label: string;
  icon: LucideIcon;
}

export const LISTING_CATEGORIES: CategoryMeta[] = [
  {
    value: "SHOUTOUT",
    label: "Shoutout",
    icon: Megaphone,
  },
  {
    value: "SPONSORED_POST",
    label: "Sponsored post",
    icon: FileText,
  },
  {
    value: "VIDEO_INTEGRATION",
    label: "Video integration",
    icon: Film,
  },
  {
    value: "DEDICATED_VIDEO",
    label: "Dedicated video",
    icon: Video,
  },
  {
    value: "LIVESTREAM",
    label: "Livestream",
    icon: Radio,
  },
  { value: "PODCAST", label: "Podcast", icon: Mic },
  {
    value: "NEWSLETTER",
    label: "Newsletter",
    icon: Mail,
  },
  { value: "AMA", label: "AMA / Q&A", icon: MessagesSquare },
  {
    value: "COLLAB",
    label: "Collab",
    icon: Handshake,
  },
  {
    value: "CONSULTING",
    label: "Consulting",
    icon: Briefcase,
  },
  { value: "OTHER", label: "Other", icon: Package },
];

const BY_VALUE = new Map(LISTING_CATEGORIES.map((c) => [c.value, c]));

export function categoryMeta(value: ListingCategory | string): CategoryMeta {
  return BY_VALUE.get(value as ListingCategory) ?? BY_VALUE.get("OTHER")!;
}

export function categoryLabel(value: ListingCategory | string): string {
  return categoryMeta(value).label;
}
