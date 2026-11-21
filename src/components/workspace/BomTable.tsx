"use client";

import { useEffect, useState, useTransition } from "react";
import type { BomItem, WorkspaceApi } from "@/lib/workspace-types";

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
export const bomTotal = (items: BomItem[]) => items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

/** One sub-system's bill of materials, edited in place. Its lines feed the project BoM. */
export function BomTable({ subsystemId, api, canEdit }: { subsystemId: string; api: WorkspaceApi; canEdit: boolean }) {
  const [items, setItems] = useState<BomItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ partNumber: "", description: "", quantity: "1", unitCost: "" });
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    api.listBom(subsystemId).then((result) => {
      if (cancelled) return;
      if (result.ok) setItems(result.items);
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsystemId]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await api.addBomItem({
        subsystemId,
        partNumber: draft.partNumber,
        description: draft.description,
        quantity: Number(draft.quantity || 0),
        unitCost: Number(draft.unitCost || 0),
      });
      if (!result.ok) return setError(result.message);
      setItems((list) => [...(list ?? []), result.item]);
      setDraft({ partNumber: "", description: "", quantity: "1", unitCost: "" });
    });
  };

  const remove = (id: string) => {
    setError(null);
    start(async () => {
      const result = await api.deleteBomItem(id);
      if (!result.ok) return setError(result.message);
      setItems((list) => (list ?? []).filter((i) => i.id !== id));
    });
  };

  if (items === null) return error ? <div className="notice notice-error" role="alert">{error}</div> : <p className="muted">Opening…</p>;

  return (
    <div className="form">
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Part no.</th><th>Description</th><th>Qty</th><th>Unit cost</th><th>Line total</th>{canEdit && <th><span className="sr-only">Remove</span></th>}</tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={canEdit ? 6 : 5} className="muted" style={{ textAlign: "center", padding: 24 }}>No parts yet.</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.part_number || "—"}</td>
                <td style={{ whiteSpace: "normal", minWidth: 180 }}>{i.description}</td>
                <td className="num">{qty(i.quantity)}</td>
                <td className="num">{money(i.unit_cost)}</td>
                <td className="num">{money(i.quantity * i.unit_cost)}</td>
                {canEdit && (
                  <td><button type="button" className="ws-text-btn" onClick={() => remove(i.id)} disabled={pending} aria-label={`Remove ${i.description}`}>Remove</button></td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} className="ws-bom-total-label">Sub-system total</td><td className="num ws-bom-total">{money(bomTotal(items))}</td>{canEdit && <td />}</tr>
          </tfoot>
        </table>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {canEdit && (
        <form onSubmit={add} className="ws-bom-add">
          <div className="field">
            <label htmlFor="bom-part">Part no.</label>
            <input id="bom-part" type="text" value={draft.partNumber} onChange={(e) => setDraft({ ...draft, partNumber: e.target.value })} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="bom-desc">Description</label>
            <input id="bom-desc" type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={200} required />
          </div>
          <div className="field">
            <label htmlFor="bom-qty">Qty</label>
            <input id="bom-qty" type="number" min="0" step="any" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="bom-cost">Unit cost ($)</label>
            <input id="bom-cost" type="number" min="0" step="0.01" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} placeholder="0.00" />
          </div>
          <button className="btn btn-primary" style={{ padding: "12px 20px", fontSize: 14 }} disabled={pending}>Add part</button>
        </form>
      )}
    </div>
  );
}
