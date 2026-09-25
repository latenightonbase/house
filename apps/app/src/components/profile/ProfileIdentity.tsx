"use client";

import { BadgeCheck } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { formatCount } from "@/lib/api";
import { shortAddress } from "@/lib/utils";
import { formatDate, type ProfileHeader } from "@/lib/profileHistory";

/** The identity block both profile pages open with. */
export function ProfileIdentity({
  profile,
  action,
}: {
  profile: ProfileHeader;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 flex-wrap">
      <Avatar
        src={profile.avatarUrl}
        fallback={profile.name.slice(0, 2).toUpperCase()}
        size={64}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[18px] font-bold text-white truncate">{profile.name}</h2>
          {profile.verified && (
            <BadgeCheck className="w-4 h-4 text-primary-bright shrink-0" aria-label="Verified" />
          )}
        </div>
        <p className="mt-1 text-[12px] text-caption">
          {profile.wallet ? shortAddress(profile.wallet) : "No wallet linked"} · Joined{" "}
          {formatDate(profile.createdAt)}
        </p>
        {profile.reach > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant="neutral">{formatCount(profile.reach)} reach</Badge>
            {profile.socials
              .filter((social) => social.followerCount)
              .map((social) => (
                <Badge key={social.platform} variant="neutral">
                  {social.platform.toLowerCase()} · {formatCount(social.followerCount)}
                </Badge>
              ))}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
