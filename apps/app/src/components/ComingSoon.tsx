import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/ui";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={title} subtitle="This section is not part of v1." />
      <Panel className="px-5 py-6">
        <p className="text-[13px] text-caption leading-relaxed break-words">
          Coming soon. For now, use Discover to browse listings and the daily auction, or
          Dashboard to manage your profile.
        </p>
      </Panel>
    </div>
  );
}
