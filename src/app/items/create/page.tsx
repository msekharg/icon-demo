'use client';

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ---------- Types / helpers ----------
type FieldKey = "name" | "description" | "notes" | "inspector" | "inspectionDate";

const initialForm = {
  name: "",
  description: "",
  notes: "",
  inspector: "",
  inspectionDate: "",
};

function toISODate(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "today") return new Date().toISOString().slice(0, 10);
  if (v === "tomorrow") return new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // MM/DD/YYYY -> ISO
  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = +mdy[1], dd = +mdy[2], yyyy = +mdy[3];
    return new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString().slice(0, 10);
  }

  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Natural language dates
  const d = new Date(value);
  if (!isNaN(d.getTime()))
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);

  return "";
}

function fieldFromSpoken(word: string): FieldKey | undefined {
  const w = word.toLowerCase();
  if (w.includes("name")) return "name";
  if (w.includes("description")) return "description";
  if (w.includes("note")) return "notes";
  if (w.includes("inspector")) return "inspector";
  if (w.includes("inspection date") || w === "date" || w.includes("date")) return "inspectionDate";
  return undefined;
}

function cleanTail(s: string) {
  return s.replace(/^\s*(is|to|as|=|:)\s*/i, "").trim();
}

// ---------- Component ----------
export default function CreateItemPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const defect = {
    code: sp.get("code") ?? "",
    name: sp.get("name") ?? "",
    severity: sp.get("severity") ?? "",
  };

  const [form, setForm] = React.useState(initialForm);
  const [activeField, setActiveField] = React.useState<FieldKey | null>(null);
  const [listening, setListening] = React.useState(false);
  const [mode, setMode] = React.useState<"global" | "field" | null>(null);
  const [transcript, setTranscript] = React.useState("");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // --------- Export to Excel (includes defect columns) ---------
  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const row = {
      "Defect Code": defect.code,
      "Defect Name": defect.name,
      "Severity Level": defect.severity,
      "Name": form.name,
      "Description": form.description,
      "Notes": form.notes,
      "Inspector": form.inspector,
      "Inspection Date": form.inspectionDate || "",
    };
    const ws = XLSX.utils.json_to_sheet([row], {
      header: [
        "Defect Code",
        "Defect Name",
        "Severity Level",
        "Name",
        "Description",
        "Notes",
        "Inspector",
        "Inspection Date",
      ],
    });
    ws["!cols"] = [
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
      { wch: 36 }, { wch: 40 }, { wch: 18 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Item");
    const slugName = (defect.name || "entry").replace(/\s+/g, "_");
    XLSX.writeFile(wb, `item_${slugName}.xlsx`);
  }

  // --------- Save to DB (your Next API route) ---------
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { defect, form: { ...form, inspectionDate: form.inspectionDate || undefined } };
      // console.log("POST payload", payload);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      alert(`Saved! id=${data.id}`);
      router.push("/");
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }
  }

  // --------- Speech recognition wiring ---------
  const recogRef = React.useRef<any>(null);

  function stopDictation() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
    setMode(null);
    setActiveField(null);
  }

  function startFieldDictation(field: FieldKey) {
    startRecognizer("field", field);
  }

  function startGlobalDictation() {
    startRecognizer("global", null);
  }

  function startRecognizer(newMode: "global" | "field", field: FieldKey | null) {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Try Chrome/Edge desktop.");
      return;
    }
    const recog = new SR();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;

    setTranscript("");
    setMode(newMode);
    setActiveField(field);
    setListening(true);
    recogRef.current = recog;

    let finalText = "";

    recog.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const chunk = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          finalText += chunk + " ";
          handleSpeechChunk(chunk.trim(), newMode, field);
        } else {
          interim += chunk;
        }
      }
      setTranscript((finalText + " " + interim).trim());
    };

    recog.onerror = () => stopDictation();
    recog.onend = () => stopDictation();
    recog.start();
  }

  // --------- Command parser / dispatcher ---------
  function handleSpeechChunk(text: string, m: "global" | "field", field: FieldKey | null) {
    const t = text.trim();

    // Global controls
    if (/^(stop|done|that'?s all|finish|end)$/i.test(t)) { stopDictation(); return; }
    if (/^save$/i.test(t)) { void fakeClickSave(); return; }
    if (/^export$/i.test(t)) { void exportToExcel(); return; }
    if (/^cancel$/i.test(t)) { router.back(); return; }

    if (m === "field" && field) {
      // In per-field mode, every final chunk goes to the active field
      applyToField(field, t);
      return;
    }

    // Global mode: grammar-based commands
    // 1) "enter text for <field>" -> focus field (value will come in following chunks)
    const mFocus = t.match(/^(enter|start|begin|focus|select|go to)\s+(?:text\s+for\s+)?(.+)$/i);
    if (mFocus) {
      const f = fieldFromSpoken(mFocus[2]);
      if (f) { setActiveField(f); return; }
    }

    // 2) "clear <field>"
    const mClear = t.match(/^clear\s+(.+)$/i);
    if (mClear) {
      const f = fieldFromSpoken(mClear[1]);
      if (f) { applyToField(f, "", true); return; }
    }

    // 3) "<field> is|to|: <value>" or "set <field> to <value>"
    const mSet =
      t.match(/^(?:set\s+)?(name|description|notes?|inspector|inspection(?:\s+)date|date)\s*(is|to|:)?\s*(.+)$/i);
    if (mSet) {
      const f = fieldFromSpoken(mSet[1])!;
      const val = cleanTail(mSet[3] ?? "");
      if (f === "inspectionDate") {
        const iso = toISODate(val);
        if (iso) applyToField(f, iso);
      } else {
        applyToField(f, val);
      }
      return;
    }

    // 4) If there is an active field (set earlier via "enter text for name"), treat as content
    if (activeField) {
      if (activeField === "inspectionDate") {
        const iso = toISODate(t);
        if (iso) applyToField(activeField, iso);
      } else {
        appendToField(activeField, t);
      }
    }
  }

  function applyToField(f: FieldKey, value: string, clear = false) {
    setForm((prev) => {
      if (f === "inspectionDate") {
        const iso = value ? toISODate(value) : "";
        return { ...prev, inspectionDate: iso };
      }
      return { ...prev, [f]: clear ? "" : value } as typeof prev;
    });
    setActiveField(f);
  }

  function appendToField(f: FieldKey, extra: string) {
    setForm((prev) => {
      if (f === "inspectionDate") {
        const iso = toISODate(extra);
        return { ...prev, inspectionDate: iso || prev.inspectionDate };
      }
      const sep = (prev as any)[f]?.length ? " " : "";
      return { ...prev, [f]: (prev as any)[f] + sep + extra } as typeof prev;
    });
  }

  async function fakeClickSave() {
    const e = new Event("submit", { bubbles: true, cancelable: true });
    const formEl = document.getElementById("create-form");
    if (formEl) formEl.dispatchEvent(e);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Create New Item</h1>
          <div className="flex items-center gap-2">
            {!listening ? (
              <Button type="button" onClick={startGlobalDictation} title="Voice command mode">
                🎤 Global Dictation
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopDictation}>
                ■ Stop
              </Button>
            )}
            {activeField && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                Active Field: <strong>{activeField}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Defect (read-only) */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Defect Code</label>
                <Input value={defect.code} disabled className="bg-gray-100 text-gray-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Defect Name</label>
                <Input value={defect.name} disabled className="bg-gray-100 text-gray-600" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Level</label>
                <Input value={defect.severity} disabled className="bg-gray-100 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dictation transcript (optional) */}
        {transcript && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-xs text-gray-600">
              <strong>Heard:</strong> {transcript}
            </CardContent>
          </Card>
        )}

        {/* Editable form */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <form id="create-form" className="space-y-4" onSubmit={submit}>
              {/* Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Name</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => startFieldDictation("name")}>
                    🎤 Dictate Name
                  </Button>
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g., Panel A-12"
                  required
                />
              </div>

              {/* Description (optional field, still supported by voice) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Description</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => startFieldDictation("description")}>
                    🎤 Dictate Description
                  </Button>
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Short description…"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Notes</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => startFieldDictation("notes")}>
                    🎤 Dictate Notes
                  </Button>
                </div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Any notes…"
                />
              </div>

              {/* Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Inspector</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => startFieldDictation("inspector")}>
                    🎤 Dictate Inspector
                  </Button>
                </div>
                <Input
                  value={form.inspector}
                  onChange={(e) => update("inspector", e.target.value)}
                  placeholder="Inspector name"
                />
              </div>

              {/* Inspection Date */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Inspection Date</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => startFieldDictation("inspectionDate")}>
                    🎤 Dictate Date
                  </Button>
                </div>
                <Input
                  type="date"
                  value={form.inspectionDate}
                  onChange={(e) => {
                    const v = e.currentTarget.value;       // browser string
                    const d = e.currentTarget.valueAsDate; // Date or null
                    if (d) {
                      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
                        .toISOString()
                        .slice(0, 10);
                      update("inspectionDate", iso);
                    } else {
                      update("inspectionDate", toISODate(v) || v);
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={exportToExcel}>
                  Export to Excel
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Voice tips: say “enter text for name … [value] … done”, or “set notes to ...”, or “inspection date August 20 2025”.
        </p>
      </div>
    </div>
  );
}
