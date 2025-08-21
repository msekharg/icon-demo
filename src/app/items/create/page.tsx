'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Full page component for creating an Item and exporting to Excel
// Requires API route at /api/items and (optionally) the `xlsx` package for export: `npm i xlsx`
export default function CreateItemPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // Read-only defect info from query params
  const defect = {
    code: sp.get('code') ?? '',
    name: sp.get('name') ?? '',
    severity: sp.get('severity') ?? '',
  };

  type FormState = {
    name: string;
    description: string;
    notes: string;
    inspector: string;
    inspectionDate: string; // YYYY-MM-DD
  };

  // Editable form fields
  const [form, setForm] = React.useState<FormState>({
    name: '',
    description: '',
    notes: '',
    inspector: '',
    inspectionDate: '',
  });

  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isSaving = status === 'saving';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setMessage(null);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        let errText = 'Failed to save';
        try {
          const body = await res.json();
          if (body?.error) errText = body.error;
        } catch {
          // ignore JSON parse errors
        }
        setStatus('error');
        setMessage(`❌ ${errText}`);
        return;
      }

      setStatus('saved');
      setMessage('✅ Saved');
      // Optional: navigate away after save
      // router.push('/items');
    } catch (err: any) {
      setStatus('error');
      setMessage(`❌ ${err?.message || 'Network error'}`);
    }
  };

  // --- Export to Excel: defect columns + editable fields ---
  async function exportToExcel() {
    const XLSX = await import('xlsx');

    // Always write date as a string so Excel displays it reliably
    const dateStr = form.inspectionDate || ''; // e.g. "2025-08-16"

    // Define headers in the exact order you want
    const headers = [
      'Defect Code',
      'Defect Name',
      'Severity Level',
      'Name',
      'Description',
      'Notes',
      'Inspector',
      'Inspection Date',
    ] as const;

    // Build one row object with keys matching the headers
    const row = {
      'Defect Code': defect.code,
      'Defect Name': defect.name,
      'Severity Level': defect.severity,
      'Name': form.name,
      'Description': form.description,
      'Notes': form.notes,
      'Inspector': form.inspector,
      'Inspection Date': dateStr, // string so it always appears
    } as Record<(typeof headers)[number], string>;

    // Create the worksheet with a fixed header order
    const ws = XLSX.utils.json_to_sheet([row], { header: [...headers] });

    // Optional: column widths
    // @ts-ignore - xlsx types don't include !cols
    ws['!cols'] = [
      { wch: 14 }, // Defect Code
      { wch: 16 }, // Defect Name
      { wch: 14 }, // Severity
      { wch: 18 }, // Name
      { wch: 24 }, // Description
      { wch: 40 }, // Notes
      { wch: 18 }, // Inspector
      { wch: 14 }, // Inspection Date
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item');

    const slugName = (defect.name || 'entry').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `item_${slugName}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Create New Item</h1>

        {/* Read-only / grayed-out Defect block */}
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

        {/* Editable form */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g., Panel A-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Short description..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Any notes…"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Inspector</label>
                <Input
                  value={form.inspector}
                  onChange={(e) => update('inspector', e.target.value)}
                  placeholder="Inspector name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Inspection Date</label>
                <Input
                  type="date"
                  value={form.inspectionDate}
                  onChange={(e) => update('inspectionDate', e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={exportToExcel}>
                  Export to Excel
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>

              {message && (
                <p className="text-sm pt-1 {status === 'error' ? 'text-red-600' : 'text-green-600'}">
                  {message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Export writes a .xlsx with headers: <code>Defect Code, Defect Name, Severity Level, Name, Description, Notes, Inspector, Inspection Date</code>.
        </p>
      </div>
    </div>
  );
}
