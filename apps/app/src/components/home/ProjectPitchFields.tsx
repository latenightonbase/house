"use client";

import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { SocialIcon } from "@/components/nav/SocialIcons";
import type { DailyProject } from "@/lib/dailyAuction";
import { cn } from "@/lib/utils";

export function Labelled({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="panel-label block">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-caption/70">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export const pitchInputClass =
  "w-full h-11 px-3.5 rounded-lg bg-surface-2 border border-line text-[14px] text-white placeholder:text-caption/60 outline-none transition-colors focus:border-primary/60";

export function ProjectPitchFields({
  project,
  onChange,
  disabled,
  idPrefix = "project",
}: {
  project: DailyProject;
  onChange: (patch: Partial<DailyProject>) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-4">
      <Labelled label="Project name" htmlFor={`${idPrefix}-name`}>
        <input
          id={`${idPrefix}-name`}
          value={project.name}
          onChange={(e) => onChange({ name: e.target.value })}
          disabled={disabled}
          maxLength={80}
          placeholder="Project XYZ"
          className={pitchInputClass}
        />
      </Labelled>

      <Labelled label="Description" hint="optional" htmlFor={`${idPrefix}-description`}>
        <textarea
          id={`${idPrefix}-description`}
          value={project.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={disabled}
          maxLength={600}
          rows={3}
          placeholder="The next generation trading protocol built for speed, transparency and DeFi."
          className={cn(pitchInputClass, "h-auto py-2.5 resize-none leading-relaxed")}
        />
      </Labelled>

      <Labelled label="Image URL" hint="optional" htmlFor={`${idPrefix}-image`}>
        <input
          id={`${idPrefix}-image`}
          type="url"
          inputMode="url"
          value={project.imageUrl ?? ""}
          onChange={(e) => onChange({ imageUrl: e.target.value })}
          disabled={disabled}
          maxLength={600}
          placeholder="https://…/artwork.png"
          className={pitchInputClass}
        />
      </Labelled>

      <div className="space-y-3">
        <p className="panel-label">Links · optional</p>
        <div className="relative">
          <Globe
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-caption"
            aria-hidden="true"
          />
          <input
            aria-label="Website"
            type="url"
            inputMode="url"
            value={project.websiteUrl ?? ""}
            onChange={(e) => onChange({ websiteUrl: e.target.value })}
            disabled={disabled}
            maxLength={300}
            placeholder="projectxyz.io"
            className={cn(pitchInputClass, "pl-10")}
          />
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-caption">
            <SocialIcon id="x" className="w-3.5 h-3.5" />
          </span>
          <input
            aria-label="X profile"
            value={project.twitterUrl ?? ""}
            onChange={(e) => onChange({ twitterUrl: e.target.value })}
            disabled={disabled}
            maxLength={300}
            placeholder="x.com/ProjectXYZ"
            className={cn(pitchInputClass, "pl-10")}
          />
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-caption">
            <SocialIcon id="youtube" className="w-4 h-4" />
          </span>
          <input
            aria-label="YouTube channel"
            value={project.youtubeUrl ?? ""}
            onChange={(e) => onChange({ youtubeUrl: e.target.value })}
            disabled={disabled}
            maxLength={300}
            placeholder="youtube.com/@ProjectXYZ"
            className={cn(pitchInputClass, "pl-10")}
          />
        </div>
      </div>
    </div>
  );
}
