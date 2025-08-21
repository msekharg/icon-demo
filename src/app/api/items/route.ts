import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';


const ItemSchema = z.object({
name: z.string().min(1),
description: z.string().optional().nullable(),
notes: z.string().optional().nullable(),
inspector: z.string().optional().nullable(),
inspectionDate: z.string().optional().nullable(), // 'YYYY-MM-DD' from <input type="date">
});


export async function POST(req: Request) {
try {
const raw = await req.json();
const data = ItemSchema.parse(raw);


const created = await prisma.item.create({
data: {
name: data.name,
description: data.description ?? null,
notes: data.notes ?? null,
inspector: data.inspector ?? null,
inspectionDate: data.inspectionDate
? new Date(data.inspectionDate)
: null,
},
});


return NextResponse.json(created, { status: 201 });
} catch (err: any) {
const message = err?.message || 'Failed to create item';
return NextResponse.json({ error: message }, { status: 400 });
}
}


export async function GET() {
try {
const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
return NextResponse.json(items);
} catch (err: any) {
return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
}
}