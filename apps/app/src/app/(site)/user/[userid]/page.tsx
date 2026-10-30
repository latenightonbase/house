import UserProfileClient from "./UserProfileClient";

/** Accepts a user id or a username — the API resolves either. */
export default async function Page({ params }: { params: Promise<{ userid: string }> }) {
  const { userid } = await params;
  return <UserProfileClient handle={userid} />;
}
