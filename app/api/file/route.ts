import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";

export async function DELETE(req: NextRequest) {
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

  const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
  try {
    await fs.unlink(filePath);
  } catch (err) {}

  await filesCol.deleteOne({ _id: new ObjectId(id) });

  return Response.json({ ok: true });
}

