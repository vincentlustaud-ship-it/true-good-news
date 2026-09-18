/** Icônes SVG inline, trait 1.6 (DESIGN.md). Jamais d'emoji, jamais de librairie. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number; stroke?: string };
const base = (size: number, stroke: string | undefined, rest: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: stroke ?? "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { flexShrink: 0 }, ...rest,
});

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M6 23h20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 23a6 6 0 0112 0" fill="var(--accent)" />
      <path d="M16 6v3M8 9.5l2 2M24 9.5l-2 2M3 17h3M26 17h3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
export function Check({ size = 13, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)} strokeWidth={2.4}><path d="M20 6L9 17l-5-5" /></svg>; }
export function Globe({ size = 13, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></svg>; }
export function Eye({ size = 13, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
export function External({ size = 14, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>; }
export function Shield({ size = 14, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><path d="M12 3l7 3v6c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>; }
export function ChevronLeft({ size = 16, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)} strokeWidth={2}><path d="M15 5l-7 7 7 7" /></svg>; }
export function ChevronRight({ size = 16, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)} strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>; }
export function Calendar({ size = 16, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>; }
export function Lock({ size = 15, stroke, ...rest }: P) { return <svg {...base(size, stroke, rest)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></svg>; }
