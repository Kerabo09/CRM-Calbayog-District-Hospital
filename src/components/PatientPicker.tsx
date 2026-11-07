"use client";
import { useState } from "react";

export type PickerPatient = { id: string; name: string; hospital_id: string; age: number; sex: string; status: string; dept: string };

export default function PatientPicker({ patients, name = "patient_id" }: { patients: PickerPatient[]; name?: string }) {
  const [id, setId] = useState(patients[0]?.id ?? "");
  const p = patients.find((x) => x.id === id);
  return (
    <div>
      <select id={name} name={name} required className="input" value={id} onChange={(e) => setId(e.target.value)}>
        {patients.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.hospital_id}</option>)}
      </select>
      {p && <p className="mt-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs text-ink-600">{p.age} years · {p.sex} · {p.status}{p.dept ? ` · ${p.dept}` : ""}</p>}
    </div>
  );
}
