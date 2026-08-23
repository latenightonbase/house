"use client";

import Avatar from "@/components/UI/Avatar";
import Badge from "@/components/UI/Badge";
import { Panel, PanelHeader, ViewAllLink } from "@/components/UI/Panel";
import type { Booking } from "@/utils/types";

interface RecentlyBookedProps {
  bookings: Booking[];
  loading?: boolean;
  onViewAll?: () => void;
}

/**
 * Horizontal strip of settled bookings. Scrolls sideways on narrow screens
 * instead of wrapping, keeping it to a single band as in the reference.
 */
export default function RecentlyBooked({
  bookings,
  loading = false,
  onViewAll,
}: RecentlyBookedProps) {
  return (
    <Panel>
      <PanelHeader
        label="Recently Booked"
        action={<ViewAllLink onClick={onViewAll} />}
      />

      {loading ? (
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[76px] rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-5">
          {bookings.map((booking) => (
            <article
              key={booking._id}
              className="tile p-3 shrink-0 max-lg:w-[210px] lg:w-auto flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Avatar
                  src={booking.markUrl}
                  alt={booking.brand}
                  size={30}
                  shape="square"
                  fallbackSeed={booking.brand}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {booking.brand}
                    </p>
                    <p className="text-[13px] font-bold text-white numeric shrink-0">
                      ${booking.amount.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[11px] text-caption truncate">
                    {booking.placement}
                  </p>
                  <p className="text-[11px] text-caption truncate">
                    {booking.creator}
                  </p>
                </div>
              </div>
              <Badge
                tone={booking.status === "CONFIRMED" ? "positive" : "warning"}
                className="self-start"
              >
                {booking.status}
              </Badge>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
