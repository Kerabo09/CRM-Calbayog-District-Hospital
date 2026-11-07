import Image from "next/image";

export default function Logo({ size = 44, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.png" alt="Calbayog District Hospital logo" width={size} height={size} priority className="rounded-full" />
      {showText && (
        <div className="leading-tight">
          <div className="text-base font-bold text-ink-900">Calbayog District Hospital</div>
          <div className="text-xs text-ink-600">Samar, Philippines</div>
        </div>
      )}
    </div>
  );
}
