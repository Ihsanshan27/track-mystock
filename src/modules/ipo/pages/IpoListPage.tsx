import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/modules/shared/context/DataContext";
import { useDialog } from "@/modules/shared/context/DialogContext";
import { usePrivacyStyle } from "@/modules/shared/hooks/usePrivacyStyle";
import { formatRupiah, formatDate } from "@/modules/shared/utils/formatters";
import type { IpoEvent, IpoSummary } from "@/modules/ipo/types/ipo";
import * as Icons from "lucide-react";
import "@/modules/ipo/ipo.css";

const DRAFT_KEY = "ipo_list_form_draft";
const DRAFT_OPEN_KEY = "ipo_list_form_open";
const EDIT_EVENT_KEY = "ipo_list_edit_event_id";

const EMPTY_FORM = { stockCode: "", offeringDate: "", ipoDate: "", offeringPrice: "", notes: "" };

export default function IpoListPage() {
   const {
      ipoEvents,
      ipoEntries,
      addIpoEvent,
      updateIpoEvent,
      addIpoEntry,
      batchAddIpoEntries,
      deleteIpoEvent,
      canWrite,
   } = useData();
   const navigate = useNavigate();
   const blurStyle = usePrivacyStyle();
   const { alert, confirm } = useDialog();

   const [editingEventId, setEditingEventId] = useState<string | null>(
      () => sessionStorage.getItem(EDIT_EVENT_KEY) || null,
   );
   const editingEvent = editingEventId
      ? ipoEvents.find((event: IpoEvent) => event.id === editingEventId) || null
      : null;

   // Persist form state across navigation using sessionStorage
   const [showForm, setShowFormState] = useState<boolean>(
      () => sessionStorage.getItem(DRAFT_OPEN_KEY) === "true",
   );
   const [form, setFormState] = useState(() => {
      try {
         const saved = sessionStorage.getItem(DRAFT_KEY);
         return saved ? JSON.parse(saved) : EMPTY_FORM;
      } catch {
         return EMPTY_FORM;
      }
   });

   const setShowForm = (v: boolean) => {
      setShowFormState(v);
      sessionStorage.setItem(DRAFT_OPEN_KEY, String(v));
   };

   const setEditingEvent = (eventId: string | null) => {
      setEditingEventId(eventId);
      if (eventId) sessionStorage.setItem(EDIT_EVENT_KEY, eventId);
      else sessionStorage.removeItem(EDIT_EVENT_KEY);
   };

   const set = (k: string, v: string) =>
      setFormState((prev) => {
         const next = { ...prev, [k]: v };
         sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
         return next;
      });

   const clearDraft = () => {
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_OPEN_KEY);
      sessionStorage.removeItem(EDIT_EVENT_KEY);
      setFormState(EMPTY_FORM);
      setShowFormState(false);
   };

   const handleOpenAdd = () => {
      setEditingEvent(null);
      clearDraft();
      setShowForm(true);
   };

   const handleOpenEdit = (event: IpoEvent) => {
      const nextForm = {
         stockCode: event.stockCode,
         offeringDate: event.offeringDate || "",
         ipoDate: event.ipoDate,
         offeringPrice: String(event.offeringPrice),
         notes: event.notes || "",
      };
      setEditingEvent(event.id);
      setFormState(nextForm);
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextForm));
      sessionStorage.removeItem(DRAFT_OPEN_KEY);
      setShowFormState(false);
   };

   const handleCancel = () => {
      clearDraft();
      setEditingEvent(null);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.stockCode || !form.ipoDate || !form.offeringPrice) {
         await alert("Mohon isi semua field yang wajib.", {
            title: "Formulir Belum Lengkap",
            severity: "warning",
         });
         return;
      }
      const payload = {
         stockCode: form.stockCode.toUpperCase(),
         offeringDate: form.offeringDate || undefined,
         ipoDate: form.ipoDate,
         offeringPrice: parseFloat(form.offeringPrice) || 0,
         notes: form.notes,
      };

      if (editingEvent) {
         updateIpoEvent(editingEvent.id, payload);
         clearDraft();
         setEditingEvent(null);
         setShowForm(false);
      } else {
         const newEvent = addIpoEvent(payload);
         clearDraft();
         if (newEvent?.id) navigate(`/ipo/${newEvent.id}`);
      }
   };

   // Duplicate an entire IPO event + all its entries
   const handleDuplicateEvent = (event: IpoEvent) => {
      const newEvent = addIpoEvent({
         stockCode: `${event.stockCode}`,
         offeringDate: event.offeringDate,
         ipoDate: event.ipoDate,
         offeringPrice: event.offeringPrice,
         notes: event.notes ? `${event.notes} (Kopi)` : "(Kopi)",
      });
      if (!newEvent?.id) return;
      const originalEntries = ipoEntries
         .filter((e: any) => e.ipoEventId === event.id)
         .map((e: any) => ({
            ipoEventId: newEvent.id,
            accountName: e.accountName,
            email: e.email,
            buyPrice: newEvent.offeringPrice,
            lots: e.lots,
            sellPrice: e.sellPrice,
            slTl: e.slTl,
            action: e.action,
            notes: e.notes,
         }));
      if (originalEntries.length > 0) {
         batchAddIpoEntries(originalEntries);
      }
      navigate(`/ipo/${newEvent.id}`);
   };

   const getSummary = (eventId: string): IpoSummary => {
      const event = ipoEvents.find((item: IpoEvent) => item.id === eventId);
      const entries = ipoEntries.filter((e: any) => e.ipoEventId === eventId);
      let totalCapital = 0,
         totalReturn = 0,
         sellCount = 0,
         keepCount = 0;
      entries.forEach((e: any) => {
         const shares = e.lots * 100;
         const buyPrice = event?.offeringPrice ?? e.buyPrice;
         const buy = buyPrice * shares;
         const sell = e.sellPrice > 0 ? e.sellPrice * shares : buy;
         const profit = e.action === "SELL" ? sell - buy : 0;
         totalCapital += buy;
         totalReturn += profit;
         if (e.action === "SELL") sellCount++;
         else keepCount++;
      });
      return {
         totalCapital,
         totalReturn,
         avgReturnPct: totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0,
         accountCount: entries.length,
         sellCount,
         keepCount,
      };
   };

   const sorted = [...ipoEvents].sort(
      (a: IpoEvent, b: IpoEvent) =>
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
   );

   const renderEventForm = (submitLabel: string, submitIcon: ReactNode, mode: "inline" | "modal" = "inline") => (
      <form onSubmit={handleSubmit}>
         <div className={`form-row ${mode === "modal" ? "ipo-grid-2" : "ipo-grid-4"}`}>
            <div className="form-group">
               <label className="form-label" htmlFor="ipo-list-stock-code">Kode Saham *</label>
               <input
                  id="ipo-list-stock-code"
                  className="form-input"
                  placeholder="Contoh: WBSA"
                  value={form.stockCode}
                  onChange={(e) => set("stockCode", e.target.value.toUpperCase())}
                  required
               />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="ipo-list-offering-date">Tanggal Penawaran</label>
               <input
                  id="ipo-list-offering-date"
                  type="date"
                  className="form-input"
                  value={form.offeringDate}
                  onChange={(e) => set("offeringDate", e.target.value)}
               />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="ipo-list-ipo-date">Tanggal IPO *</label>
               <input
                  id="ipo-list-ipo-date"
                  type="date"
                  className="form-input"
                  value={form.ipoDate}
                  onChange={(e) => set("ipoDate", e.target.value)}
                  required
               />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="ipo-list-offering-price">Harga Penawaran (Rp) *</label>
               <input
                  id="ipo-list-offering-price"
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="Contoh: 100"
                  value={form.offeringPrice}
                  onChange={(e) => set("offeringPrice", e.target.value)}
                  required
               />
            </div>
         </div>
         <div className="form-group" style={{ marginTop: mode === "modal" ? 4 : 0 }}>
             <label className="form-label" htmlFor="ipo-list-notes">Catatan</label>
             <textarea
                id="ipo-list-notes"
                className="form-input"
               placeholder="Catatan singkat tentang IPO ini..."
               value={form.notes}
               onChange={(e) => set("notes", e.target.value)}
               rows={mode === "modal" ? 4 : 1}
               style={{ resize: "vertical", minHeight: mode === "modal" ? 108 : undefined }}
            />
         </div>
         <div className="ipo-flex-wrap">
            <button type="submit" className="btn btn-primary">
               {submitIcon}
               {submitLabel}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
               <Icons.X size={15} />
               Batal
            </button>
         </div>
      </form>
   );

   return (
      <div>
         <div className="page-header">
            <div>
               <h1
                  className="page-title"
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
               >
                  <Icons.Rocket size={26} style={{ color: "var(--accent-green)" }} />
                  IPO Journey
               </h1>
               <p className="page-subtitle">
                  Lacak partisipasi IPO dari berbagai akun dalam satu tempat
               </p>
            </div>
             <div className="ipo-actions-row">
                <button
                   className="btn btn-secondary"
                   onClick={() => navigate("/ipo/summary")}
                >
                  <Icons.BarChart3 size={16} />
                  Ringkasan IPO
               </button>
               {canWrite && (
                  <button
                     className="btn btn-primary"
                     onClick={() => {
                        if (showForm || editingEvent) {
                           handleCancel();
                        } else {
                           handleOpenAdd();
                        }
                     }}
                  >
                     {showForm || editingEvent ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
                     {showForm || editingEvent ? "Batal" : "Buat IPO Baru"}
                  </button>
               )}
            </div>
         </div>

         {showForm && !editingEvent && (
             <div className="card ipo-card-accent-wide">
               <div className="card-header">
                  <h3 className="card-title">
                     <Icons.PlusCircle size={16} style={{ color: "var(--accent-green)" }} />
                     Buat IPO Event Baru
                  </h3>
               </div>
               <div className="card-body">
                  {renderEventForm(" Buat & Mulai Catat", <Icons.Rocket size={15} />)}
               </div>
            </div>
         )}

         {sorted.length === 0 ? (
            <div className="empty-state">
               <div className="empty-state-icon ipo-empty-icon">
                  <Icons.Rocket size={48} style={{ color: "var(--text-muted)" }} />
               </div>
               <div className="empty-state-title">Belum ada IPO Journey</div>
               <div className="empty-state-desc">
                  Buat IPO event pertama Anda untuk mulai mencatat partisipasi dari berbagai akun.
               </div>
               {canWrite && (
                  <button
                      className="btn btn-primary ipo-empty-cta"
                      onClick={handleOpenAdd}
                  >
                     <Icons.Plus size={16} /> Buat IPO Pertama
                  </button>
               )}
            </div>
         ) : (
            <div className="ipo-list-grid">
               {sorted.map((event: IpoEvent) => {
                  const summary = getSummary(event.id);
                  const isProfit = summary.totalReturn >= 0;
                  const hasEntries = summary.accountCount > 0;
                  return (
                     <div
                        key={event.id}
                        className="bento-card ipo-list-card"
                        style={{
                           borderLeft: hasEntries
                              ? `4px solid ${isProfit ? "var(--accent-green)" : "var(--accent-red)"}`
                              : "4px solid var(--border-color)",
                        }}
                        onClick={() => navigate(`/ipo/${event.id}`)}
                     >
                        <div className="ipo-list-head">
                           <div>
                              <div className="ipo-list-meta">
                                 <span className="ipo-badge-pill ipo-badge-stock ipo-badge-stock-sm">
                                    {event.stockCode}
                                 </span>
                                 <span className="ipo-small-label">
                                    IPO
                                 </span>
                              </div>
                              <div className="ipo-list-submeta">
                                 {event.offeringDate
                                    ? `Penawaran: ${formatDate(event.offeringDate)} · `
                                    : ""}
                                 IPO: {formatDate(event.ipoDate)} &nbsp;·&nbsp; Harga:{" "}
                                 <strong>{formatRupiah(event.offeringPrice)}</strong>
                              </div>
                           </div>
                           <div className="ipo-list-tools" onClick={(e) => e.stopPropagation()}>
                              {canWrite && (
                                 <>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-tool-copy"
                                       onClick={() => handleOpenEdit(event)}
                                       title="Edit IPO"
                                       aria-label={`Edit IPO ${event.stockCode}`}
                                    >
                                       <Icons.Edit3 size={14} />
                                    </button>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-tool-copy"
                                       onClick={() => handleDuplicateEvent(event)}
                                       title="Duplikat IPO ini (salin semua akun)"
                                       aria-label={`Duplikat IPO ${event.stockCode}`}
                                    >
                                       <Icons.Copy size={14} />
                                    </button>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-close"
                                       onClick={async () => {
                                          const isConfirmed = await confirm(
                                             `Apakah Anda yakin ingin menghapus IPO ${event.stockCode}? Semua catatan akun dalam IPO ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
                                             {
                                                title: "Hapus IPO Event",
                                                severity: "danger",
                                                confirmText: "Hapus",
                                             },
                                          );
                                          if (isConfirmed) {
                                             deleteIpoEvent(event.id);
                                          }
                                       }}
                                       title="Hapus IPO"
                                       aria-label={`Hapus IPO ${event.stockCode}`}
                                    >
                                       <Icons.Trash2 size={14} />
                                    </button>
                                 </>
                              )}
                           </div>
                        </div>

                        {hasEntries ? (
                           <div className="ipo-profit-block">
                              <div className="ipo-profit-title">
                                 Total Profit / Loss
                              </div>
                              <div
                                 className={`font-mono ${isProfit ? "text-profit" : "text-loss"}`}
                                 style={{
                                    fontSize: "1.7rem",
                                    fontWeight: 800,
                                    letterSpacing: "-0.03em",
                                    ...blurStyle,
                                 }}
                              >
                                 {isProfit ? "+" : ""}
                                 {formatRupiah(summary.totalReturn)}
                              </div>
                              <div className="ipo-profit-avg" style={{ color: isProfit ? "var(--accent-green)" : "var(--accent-red)", ...blurStyle }}>
                                 {isProfit ? "+" : ""}
                                 {summary.avgReturnPct.toFixed(2)}% avg return
                              </div>
                           </div>
                        ) : (
                           <div className="ipo-profit-empty">
                              Belum ada catatan akun - klik untuk mulai mengisi
                           </div>
                        )}

                        <div
                           style={{
                              display: "flex",
                              gap: 12,
                              borderTop: "1px solid var(--border-color)",
                              paddingTop: 12,
                           }}
                        >
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                                 {summary.accountCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                 }}
                              >
                                 Akun
                              </div>
                           </div>
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div
                                 style={{
                                    fontSize: "1.2rem",
                                    fontWeight: 800,
                                    color: "var(--accent-green)",
                                 }}
                              >
                                 {summary.sellCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                 }}
                              >
                                 Sell
                              </div>
                           </div>
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div
                                 style={{
                                    fontSize: "1.2rem",
                                    fontWeight: 800,
                                    color: "var(--accent-yellow)",
                                 }}
                              >
                                 {summary.keepCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                 }}
                              >
                                 Keep
                              </div>
                           </div>
                           {hasEntries && (
                              <div style={{ textAlign: "center", flex: 1 }}>
                                 <div
                                    style={{ fontSize: "1.2rem", fontWeight: 800, ...blurStyle }}
                                 >
                                    {formatRupiah(summary.totalCapital).replace("Rp", "").trim()}
                                 </div>
                                 <div
                                    style={{
                                       fontSize: "0.68rem",
                                       color: "var(--text-muted)",
                                       textTransform: "uppercase",
                                       letterSpacing: "0.05em",
                                    }}
                                 >
                                    Modal
                                 </div>
                              </div>
                           )}
                        </div>

                        {event.notes && (
                           <div
                              style={{
                                 marginTop: 10,
                                 fontSize: "0.75rem",
                                 color: "var(--text-secondary)",
                                 borderTop: "1px solid var(--border-color)",
                                 paddingTop: 8,
                              }}
                           >
                              📝 {event.notes}
                           </div>
                        )}

                     </div>
                  );
               })}
            </div>
         )}

         {editingEvent && canWrite && (
            <div className="modal-overlay ipo-modal-overlay" onClick={handleCancel}>
               <div className="modal ipo-modal ipo-modal-wide" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header ipo-modal-header">
                     <div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                           <Icons.Edit3 size={17} style={{ color: "var(--accent-blue-light)" }} />
                           Edit IPO Event
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                           Rapikan detail kode saham, tanggal, harga penawaran, dan catatan IPO tanpa mengganggu card di belakang.
                        </p>
                     </div>
                     <button
                        className="btn btn-ghost btn-icon ipo-btn-close"
                        onClick={handleCancel}
                        aria-label="Tutup modal edit IPO"
                     >
                        <Icons.X size={18} />
                     </button>
                  </div>
                  <div className="modal-body ipo-modal-body">
                     {renderEventForm(" Simpan Perubahan", <Icons.Save size={15} />, "modal")}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
