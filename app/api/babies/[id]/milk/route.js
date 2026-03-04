import { NextResponse } from "next/server";
import * as dal from "../../../../../lib/dal.js";
import { getUser } from "../../../../../lib/session.js";

function toLocalDateTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function POST(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const baby = dal.getBabyForUser(id, user.id);
    if (!baby) {
      return NextResponse.json({ error: "Baby not found" }, { status: 404 });
    }

    const body = await request.json();
    const started_at = body?.started_at || toLocalDateTime(new Date());
    const volume_ml = parseInt(body?.volume_ml || "0", 10) || 0;

    const entry = dal.addMilk(id, user.id, {
      volume_ml,
      fed_at: started_at,
      started_at,
      ended_at: null,
      duration_minutes: null,
      notes: null,
    });

    return NextResponse.json({ success: true, entryId: entry.id });
  } catch (err) {
    console.error("POST /api/babies/[id]/milk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const baby = dal.getBabyForUser(id, user.id);
    if (!baby) {
      return NextResponse.json({ error: "Baby not found" }, { status: 404 });
    }

    const body = await request.json();
    const entryId = body?.entryId;
    if (!entryId) {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }

    const updated = dal.updateMilk(id, entryId, {
      volume_ml: parseInt(body?.volume_ml || "0", 10) || 0,
      fed_at: body?.fed_at,
      started_at: body?.started_at,
      ended_at: body?.ended_at,
      duration_minutes: body?.duration_minutes,
      notes: body?.notes,
    });

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/babies/[id]/milk error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
