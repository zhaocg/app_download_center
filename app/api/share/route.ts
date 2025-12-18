import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getFilesCollection } from "../../../lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = String(body.id || "").trim();
  if (!id) {
    return new Response("缺少文件标识", { status: 400 });
  }

  const filesCol = await getFilesCollection();
  const doc = await filesCol.findOne({ _id: new ObjectId(id) });
  if (!doc) {
    return new Response("未找到文件", { status: 404 });
  }

  const existingShareId = doc.shareId;
  const shareId = existingShareId && existingShareId.length > 0 ? existingShareId : randomUUID();

  if (!existingShareId) {
    await filesCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { shareId } }
    );
  }

  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const url = `${origin}/share/${shareId}`;

  return Response.json({ ok: true, shareId, url });
}

