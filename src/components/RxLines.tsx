"use client";
import { useState } from "react";

type Med = { id: string; label: string; stock: number; unit: string };

export default function RxLines({ medicines }: { medicines: Med[] }) {
  const [lines, setLines] = useState([{ id: 0 }]);
  const [next, setNext] = useState(1);
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold">Medicines</h2>
      <p className="mb-4 text-sm text-ink-600">Quantity is in dispensing units. Stock is checked when the pharmacy dispenses.</p>
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="grid grid-cols-[1.4fr_90px_1.4fr_28px] items-center gap-2">
            <select name="med_id" required className="input">{medicines.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.stock} {m.unit} in stock)</option>)}</select>
            <input name="qty" type="number" min={1} required defaultValue={10} className="input" aria-label="Quantity" />
            <input name="instr" className="input" placeholder="e.g. 1 tablet twice a day after meals" />
            <button type="button" aria-label="Remove medicine" disabled={lines.length === 1} className="text-ink-400 hover:text-red-600 disabled:opacity-30" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>✕</button>
          </div>))}
      </div>
      <button type="button" className="mt-3 text-sm font-semibold text-brand-600" onClick={() => { setLines([...lines, { id: next }]); setNext(next + 1); }}>+ Add medicine</button>
    </section>
  );
}
