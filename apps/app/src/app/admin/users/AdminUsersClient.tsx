"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search, ShieldCheck, UserSearch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Badge, Button, Card, Panel, TextInput, Tile } from "@/components/ui";
import { fetchAdminUsers, setUserVerified, type AdminUser } from "@/lib/marketplace";
import { shortAddress } from "@/lib/utils";
import { formatDate } from "@/lib/profileHistory";
import { AdminTabs } from "../AdminTabs";

/** Long enough that typing a handle is one request, not one per key. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * The blue check. There is no proxy or KYC behind it — it is an admin vouching
 * for a seller they know personally, so it is granted and removed by hand here
 * and nowhere else. It shows on the seller's profile, listing cards and
 * listing pages.
 */
export default function AdminUsersClient() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      fetchAdminUsers(query)
        .then((next) => {
          if (!active) return;
          setUsers(next);
          setLoadError(null);
        })
        .catch((err: unknown) => {
          if (active) setLoadError(err instanceof Error ? err.message : "Could not load accounts.");
        });
    }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [query]);

  async function toggle(user: AdminUser) {
    const next = !user.verified;
    if (
      !next &&
      !window.confirm(`Remove the verified check from ${user.name}?`)
    ) {
      return;
    }
    setWorking(user.id);
    setRowError((e) => ({ ...e, [user.id]: "" }));
    try {
      const verified = await setUserVerified(user.id, next);
      setUsers((current) =>
        current?.map((u) => (u.id === user.id ? { ...u, verified } : u)) ?? null,
      );
    } catch (err) {
      setRowError((e) => ({
        ...e,
        [user.id]: err instanceof Error ? err.message : "Could not update verification.",
      }));
    } finally {
      setWorking(null);
    }
  }

  const searching = query.trim().length > 0;

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title="Admin · Verification"
        subtitle="Give a blue check to sellers you know personally. It shows next to their name on their profile and every listing, so buyers know the account is legit."
        action={<AdminTabs />}
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-caption"
          aria-hidden="true"
        />
        <TextInput
          type="search"
          aria-label="Search accounts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username, social handle or wallet"
          className="pl-9"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {loadError && (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {loadError}
        </Tile>
      )}

      {!searching && users && users.length > 0 && (
        <p className="panel-label">Verified accounts · {users.length}</p>
      )}

      {users === null && !loadError ? (
        <div className="card h-40 animate-pulse bg-white/[0.03]" />
      ) : users?.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-12 text-center">
          {searching ? (
            <UserSearch className="w-7 h-7 text-caption" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-caption" aria-hidden="true" />
          )}
          <p className="text-[14px] font-semibold text-white">
            {searching ? "No accounts match" : "Nobody is verified yet"}
          </p>
          <p className="text-[12px] text-caption max-w-sm">
            {searching
              ? "Try their username without the @, a linked social handle, or part of their wallet."
              : "Search for a seller above to give them the blue check."}
          </p>
        </Panel>
      ) : (
        <ul className="space-y-2">
          {users?.map((user) => {
            const busy = working === user.id;
            const handle = user.username ?? user.id;
            return (
              <li key={user.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.name}
                      fallbackSeed={user.wallet ?? user.id}
                      fallback={user.name.slice(0, 2).toUpperCase()}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-white">
                        <Link
                          href={`/user/${handle}`}
                          className="truncate transition-colors hover:text-primary-light"
                        >
                          {user.name}
                        </Link>
                        {user.verified && (
                          <BadgeCheck
                            className="h-4 w-4 shrink-0 text-primary-bright"
                            aria-label="Verified"
                          />
                        )}
                        {user.role === "SUPERADMIN" && <Badge variant="neutral">Admin</Badge>}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-caption">
                        {user.wallet ? (
                          <span className="numeric">{shortAddress(user.wallet)}</span>
                        ) : (
                          "No wallet"
                        )}
                        {" · "}
                        {user.listingCount} {user.listingCount === 1 ? "listing" : "listings"}
                        {" · "}
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={user.verified ? "accent-outline" : "primary"}
                      onClick={() => void toggle(user)}
                      disabled={busy}
                      aria-pressed={user.verified}
                      className="shrink-0"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {busy ? "Saving…" : user.verified ? "Remove check" : "Verify"}
                    </Button>
                  </div>
                  {rowError[user.id] && (
                    <p className="mt-2 text-[12px] text-negative">{rowError[user.id]}</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
