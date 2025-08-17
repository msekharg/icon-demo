'use client';

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { motion } from "framer-motion";

// -------- ACTIONS --------
const ACTIONS = [
  { id: "crack",    label: "Crack",     image: "/icons/Crack.jpeg",    blurb: "This is a crack.",     href: "/items/create?code=DC-CK-01&name=Crack&severity=Red" },
  { id: "flash",    label: "Flash",     image: "/icons/Flash.jpeg",    blurb: "This is a flash.",     href: "/items/create" },
  { id: "pinhole",  label: "Pin Hole",  image: "/icons/PinHole.jpeg",  blurb: "This is a pin hole.",  href: "/items/create" },
  { id: "damage",   label: "Damage",    image: "/icons/Damage.jpeg",   blurb: "This is a damage.",    href: "/items/create" },
  { id: "sink",     label: "Sink",      image: "/icons/Sink.jpeg",     blurb: "This is a sink.",      href: "/items/create" },
  { id: "scratch",  label: "Scratch",   image: "/icons/Scratch.jpeg",  blurb: "This is a scratch.",   href: "/items/create" },
  { id: "coldshut", label: "Cold Shut", image: "/icons/ColdShut.jpeg", blurb: "This is a cold shut.", href: "/items/create" },
  { id: "blister",  label: "Blister",   image: "/icons/Blister.jpeg",  blurb: "This is a blister.",   href: "/items/create" },
];

// -------- TILE (card, not full-width button) --------
function Tile({ action, onOpen }: { action: any; onOpen: (a: any) => void }) {
  const router = useRouter();
  const handleClick = () => (action.href ? router.push(action.href) : onOpen(action));

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="cursor-pointer rounded-2xl border bg-white shadow-sm hover:shadow-md transition p-8 flex flex-col items-center justify-center gap-4"
    >
      {action.image ? (
        <Image
          src={action.image}
          alt={action.label}
          width={96}
          height={96}
          className="rounded-full object-cover ring-2 ring-red-300 p-1"
        />
      ) : (
        <div className="w-16 h-16 rounded bg-gray-200" />
      )}
      <span className="text-lg font-semibold text-gray-900">{action.label}</span>
    </motion.div>
  );
}

export default function Page() {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [current, setCurrent] = React.useState<any>(null);

  const filtered = ACTIONS.filter(
    (a) =>
      (filter === "all" || a.id.startsWith(filter)) &&
      (query.trim() === "" || a.label.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Icon Demo Launcher</h1>
          <div className="flex gap-3 w-full md:w-auto">
            <Input
              placeholder="Search actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:w-80"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="s">Starts with 's'</SelectItem>
                <SelectItem value="d">Starts with 'd'</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="grid">Defekts</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
          </TabsList>

          {/* EXACTLY 3 COLUMNS */}
          <TabsContent value="grid" className="mt-4">
            <div
              className="grid gap-6 md:gap-x-10 md:gap-y-12"
              style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              {filtered.map((a) => (
                <Tile key={a.id} action={a} onOpen={setCurrent} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="starred" className="text-sm text-muted-foreground mt-4">
            Star your favorites in a future iteration.
          </TabsContent>

          <TabsContent value="settings" className="text-sm text-muted-foreground mt-4">
            Placeholder settings panel.
          </TabsContent>

          {/* Guide tab: same 3-column grid, navigate to /guide/:id */}
          <TabsContent value="guide" className="mt-4">
            <div
                className="grid gap-6 md:gap-x-10 md:gap-y-12"
              style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
            >
              {filtered.map((a) => (
                <Tile key={`guide-${a.id}`} action={{ ...a, href: `/guide/${a.id}` }} onOpen={setCurrent} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="rounded-2xl">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Tip: Each tile opens a modal describing a possible task.
          </CardContent>
        </Card>
      </div>

      {/* Dialog: safe header for image tiles */}
      <Dialog open={!!current} onOpenChange={(open) => !open && setCurrent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {current?.image ? (
                <Image src={current.image} alt={current.label} width={20} height={20} className="rounded" />
              ) : current?.icon ? (
                React.createElement(current.icon, { className: "w-5 h-5" })
              ) : null}
              {current?.label}
            </DialogTitle>
            <DialogDescription>{current?.blurb}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-gray-100 p-3">
              <pre className="whitespace-pre-wrap">{`// TODO: implement ${current?.id}
// Example: call an API, show progress, and render results.
await new Promise(r => setTimeout(r, 800)); // fake delay
return { ok: true };`}</pre>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCurrent(null)}>Close</Button>
              <Button onClick={() => alert(`${current?.label} triggered (demo)`)}>Run Demo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
