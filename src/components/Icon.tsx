const P: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  users: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21c0-4 4-6 8-6s8 2 8 6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  file: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  card: "M3 6h18v12H3zM3 10h18",
  pill: "M10.5 20.5a5 5 0 01-7-7l7-7a5 5 0 017 7zM8.5 8.5l7 7",
  team: "M12 8a3 3 0 100-6 3 3 0 000 6zM5 21v-3a4 4 0 014-4h6a4 4 0 014 4v3",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2L10 21h4l.6-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bed: "M3 18V6M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5",
  out: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  heart: "M12 20s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.4-7 10-7 10z",
};
export default function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof P | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] ?? P.file} />
    </svg>
  );
}
