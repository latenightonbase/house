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
  /** One line of help shown under the picker in the create form. */
  hint: string;
  icon: LucideIcon;
}

export const LISTING_CATEGORIES: CategoryMeta[] = [
  {
    value: "SHOUTOUT",
    label: "Shoutout",
    hint: "A short mention or story slot.",
    icon: Megaphone,
  },
  {
    value: "SPONSORED_POST",
    label: "Sponsored post",
    hint: "A standalone post, reel or thread.",
    icon: FileText,
  },
  {
    value: "VIDEO_INTEGRATION",
    label: "Video integration",
    hint: "A segment inside a video you were already making.",
    icon: Film,
  },
  {
    value: "DEDICATED_VIDEO",
    label: "Dedicated video",
    hint: "A whole video built around the brand.",
    icon: Video,
  },
  {
    value: "LIVESTREAM",
    label: "Livestream",
    hint: "A read, segment or takeover during a live show.",
    icon: Radio,
  },
  { value: "PODCAST", label: "Podcast", hint: "A host-read spot or guest slot.", icon: Mic },
  {
    value: "NEWSLETTER",
    label: "Newsletter",
    hint: "Placement in a send to your list.",
    icon: Mail,
  },
  { value: "AMA", label: "AMA / Q&A", hint: "A live session with your audience.", icon: MessagesSquare },
  {
    value: "COLLAB",
    label: "Collab",
    hint: "A joint piece made with the buyer.",
    icon: Handshake,
  },
  {
    value: "CONSULTING",
    label: "Consulting",
    hint: "Your time — strategy, review, advisory.",
    icon: Briefcase,
  },
  { value: "OTHER", label: "Other", hint: "Anything that does not fit the rest.", icon: Package },
];

const BY_VALUE = new Map(LISTING_CATEGORIES.map((c) => [c.value, c]));

export function categoryMeta(value: ListingCategory | string): CategoryMeta {
  return BY_VALUE.get(value as ListingCategory) ?? BY_VALUE.get("OTHER")!;
}

export function categoryLabel(value: ListingCategory | string): string {
  return categoryMeta(value).label;
}
