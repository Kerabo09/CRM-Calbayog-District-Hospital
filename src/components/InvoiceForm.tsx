"use client";
import { useState } from "react";
import { peso } from "@/lib/format";

type Line = { d: string; q: number; p: number };
const money = (n: number) => peso(n);

export default function InvoiceFields() {
  const [lines, setLines] = useState<Line[]>([{ d: "Consultation", q: 1, p: 1500 }]);
  const [discount, setDiscount] = useState(0);
  const [ph, setPh] = useState(0);
  const total = lines.reduce((s, l) => s + l.q * l.p, 0);
  const balance = Math.max(total - discount - ph, 0);
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <>
      <section className="card p-6">
        <h2 className="text-base font-semibold">Itemized services</h2>
        <p className="mb-4 text-sm text-ink-600">All amounts are in Philippine pesos (PHP). Enter the quantity and price per unit.</p>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_110px_110px_32px] items-center gap-2">
              <input name="item_desc" className="input" placeholder="Service / description" value={l.d} onChange={(e) => set(i, { d: e.target.value })} />
              <input name="item_qty" type="number" min={1} className="input" value={l.q} onChange={(e) => set(i, { q: Number(e.target.value) })} />
              <input name="item_price" type="number" min={0} step="0.01" className="input" value={l.p} onChange={(e) => set(i, { p: Number(e.target.value) })} />
              <div className="text-right text-sm font-medium">{money(l.q * l.p)}</div>
              <button type="button" aria-label="Remove line" className="text-ink-400 hover:text-red-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 text-sm font-semibold text-brand-600" onClick={() => setLines([...lines, { d: "", q: 1, p: 0 }])}>+ Add line item</button>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold">Discounts & coverage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Discount type</label><select name="discount_type" className="input"><option value="">None</option><option>Hospital assistance</option><option>Senior citizen</option><option>PWD</option></select></div>
          <div><label className="label">Discount amount (PHP)</label><input name="discount_amount" type="number" min={0} step="0.01" className="input" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
          <div><label className="label">PhilHealth coverage (PHP)</label><input name="philhealth_amount" type="number" min={0} step="0.01" className="input" value={ph} onChange={(e) => setPh(Number(e.target.value))} /></div>
          <div><label className="label">PhilHealth / claim reference</label><input name="philhealth_ref" className="input" /></div>
        </div>
        <p className="mt-2 text-xs text-ink-400">Enter the verified eligible benefit amount.</p>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-base font-semibold">Invoice summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Total charges</dt><dd>{money(total)}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>−{money(discount)}</dd></div>
          <div className="flex justify-between"><dt>PhilHealth coverage</dt><dd>−{money(ph)}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Balance due</dt><dd>{money(balance)}</dd></div>
        </dl>
      </section>
    </>
  );
}
