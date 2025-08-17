'use client';

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

// ---------- DATA ----------
const DEFECTS: Record<
  string,
  {
    title: string;
    code: string;
    severity: "Red" | "Yellow" | "Green";
    severityScore: 1 | 2 | 3 | 4 | 5;   // 1..5 for the 5-bar meter
    type: string;
    causes: string[];
    actions: string[];
    photo: string;   // big left photo
    sketch?: string; // small circular sketch (optional)
  }
> = {
  crack: {
    title: "Crack",
    code: "DC-CRK",
    severity: "Red",
    severityScore: 3, // shows 3/5 with 3 red bars
    type: "Fracture / Separation",
    causes: ["Excessive Stress", "Sharp Corners", "Material shrinkage"],
    actions: ["Inspect mold/cavity", "Isolate batch", "Check cooling lines"],
    photo: "/guide/crack_main.jpeg",
    sketch: "/guide/crack_thumb.jpeg",
  },
  flash: {
    title: "Flash",
    code: "DC-FL",
    severity: "Yellow",
    severityScore: 2,
    type: "Excess Metal at Parting Line",
    causes: ["Low clamp tonnage", "Die mismatch/wear", "High injection pressure"],
    actions: ["Increase clamp force", "Rework parting surfaces", "Tune shot pressure/timing"],
    photo: "/guide/flash_main.jpeg",
    sketch: "/guide/flash_thumb.jpeg",
  },
  pinhole: {
    title: "Pin Hole",
    code: "DC-PH",
    severity: "Yellow",
    severityScore: 2,
    type: "Gas Porosity (Micro-voids)",
    causes: ["Poor venting", "High melt temp / gas pickup", "Turbulent fill"],
    actions: ["Improve venting/vacuum", "Degas alloy, tune temps", "Smooth shot profile"],
    photo: "/guide/pinhole_main.jpeg",
    sketch: "/guide/pinhole_thumb.jpeg",
  },
  damage: {
    title: "Damage",
    code: "DC-DMG",
    severity: "Red",
    severityScore: 4,
    type: "Mechanical Handling Damage",
    causes: ["Impact during conveyance", "Trim/ejector marks", "Rack/fixture abrasion"],
    actions: ["Protect dunnage", "Polish ejectors/trim", "Revise handling SOP"],
    photo: "/guide/damage_main.jpeg",
    sketch: "/guide/damage_thumb.jpeg",
  },
  sink: {
    title: "Sink",
    code: "DC-SNK",
    severity: "Yellow",
    severityScore: 2,
    type: "Surface Depression / Local Shrink",
    causes: ["Thick sections", "Early gate freeze", "Non-uniform cooling"],
    actions: ["Increase hold pressure/time", "Add ribs/cores", "Add/retune cooling"],
    photo: "/guide/sink_main.jpeg",
    sketch: "/guide/sink_thumb.jpeg",
  },
  scratch: {
    title: "Scratch",
    code: "DC-SCR",
    severity: "Green",
    severityScore: 1,
    type: "Surface Mar / Abrasion",
    causes: ["Rough handling", "Ejector drag", "Deburr media contact"],
    actions: ["Protect surfaces", "Polish/alignment of ejectors", "Adjust deburr media/time"],
    photo: "/guide/scratch_main.jpeg",
    sketch: "/guide/scratch_thumb.jpeg",
  },
  coldshut: {
    title: "Cold Shut",
    code: "DC-CS",
    severity: "Red",
    severityScore: 4,
    type: "Fronts Non-fusion / Cold Lap",
    causes: ["Low melt/die temp", "Slow injection", "Poor gate/runner or venting"],
    actions: ["Raise melt/die temp", "Increase shot speed", "Redesign gate/vent/overflow"],
    photo: "/guide/coldshut_main.jpeg",
    sketch: "/guide/coldshut_thumb.jpeg",
  },
  blister: {
    title: "Blister",
    code: "DC-BLS",
    severity: "Yellow",
    severityScore: 2,
    type: "Gas Expansion / Sub-surface Porosity",
    causes: ["Entrapped gas outgassing", "Surface contaminants", "Shallow porosity"],
    actions: ["Pre-bake parts", "Improve cleaning", "Reduce porosity upstream"],
    photo: "/guide/blister_main.jpeg",
    sketch: "/guide/blister_thumb.jpeg",
  },
};

// ---------- UI HELPERS ----------
function SectionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12">
      <div className="col-span-5 border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold">
        {label}
      </div>
      <div className="col-span-7 border border-gray-300 px-3 py-2 text-sm text-gray-800">
        {children}
      </div>
    </div>
  );
}

// 5-block severity meter with score label (e.g., 3/5)
function SeverityMeter5({
  score,
  level,
}: {
  score: 1 | 2 | 3 | 4 | 5;
  level: "Red" | "Yellow" | "Green";
}) {
  const active =
    level === "Red" ? "bg-red-500"
    : level === "Yellow" ? "bg-yellow-400"
    : "bg-green-500";

  const inactive = "bg-gray-200";

  return (
    <div className="flex items-center gap-3">
      {/* 5 blocks */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-5 w-8 rounded-sm border border-gray-300 ${i <= score ? active : inactive}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-xs font-medium text-gray-700">{score}/5</span>
    </div>
  );
}


// ---------- PAGE (client; uses useParams) ----------
export default function GuideDefectPage() {
  const router = useRouter();
  const params = useParams() as { defect?: string };
  const key = (params.defect ?? "").toLowerCase();
  const d = DEFECTS[key];

  if (!d) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white shadow border border-gray-300 p-6">
            <p className="text-sm">Defect not found.</p>
            <button
              className="mt-3 text-blue-600 hover:underline"
              onClick={() => router.push("/")}
            >
              ← Back to Guide
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Card container */}
        <div className="rounded-xl bg-white shadow border border-gray-300 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-300 px-4 py-3">
            <h1 className="text-lg font-semibold">Die Casting {d.title} Defect Card</h1>
          </div>

          {/* Body grid: photo left, spec panel right */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Left photo (reduced size) */}
            <div className="md:col-span-2 border-r border-gray-300 flex items-center justify-center p-4">
              <Image
                src={d.photo}
                alt={`${d.title} photo`}
                width={600}
                height={400}
                className="object-contain rounded-md"
                priority
              />
            </div>

            {/* Right panel */}
            <div className="md:col-span-1">
              {/* Title + Code (full width since sketch block is hidden) */}
              <div className="grid grid-cols-12">
                <div className="col-span-12 border border-gray-300 px-3 py-2">
                  <div className="text-lg font-semibold leading-tight">{d.title}</div>
                  <div className="text-xs text-gray-600">{d.code}</div>
                </div>
              </div>

             <SectionRow label="Severity">
  <SeverityMeter5 score={d.severityScore} level={d.severity} />
</SectionRow>


              <SectionRow label="Defect Type">{d.type}</SectionRow>

              <SectionRow label="Possible Causes">
                <ul className="list-disc pl-5 space-y-1">
                  {d.causes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </SectionRow>

              <SectionRow label="Suggested Action">
                <ul className="list-disc pl-5 space-y-1">
                  {d.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </SectionRow>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-3 text-sm">
          <a href="/#guide" className="text-blue-600 hover:underline">← Back to Guide</a>
        </div>
      </div>
    </div>
  );
}
