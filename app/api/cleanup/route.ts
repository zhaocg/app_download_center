import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { CLEANUP_TOKEN, DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta } from "../../../types/file";

interface CleanupResult {
  checked: number;
  removed: number;
  limit: number;
  hasMore: boolean;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-cleanup-token") || "";
  if (!CLEANUP_TOKEN || token !== CLEANUP_TOKEN) {
    return new Response("未授权", { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const limitRaw = (body as { limit?: unknown }).limit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 1000)
      : 200;

  const filesCol = await getFilesCollection();

  const cursor = filesCol
    .find({}, { projection: { _id: 1, relativePath: 1, fileName: 1 } })
    .sort({ uploadedAt: 1 })
    .limit(limit);

  const toRemoveIds: ObjectId[] = [];
  const checkedDocs: { _id: ObjectId; relativePath: string; fileName: string }[] =
    [];

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as Pick<
      FileMeta,
      "_id" | "relativePath" | "fileName"
    > | null;
    if (!doc || !doc._id) {
      continue;
    }
    const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
    checkedDocs.push({
      _id: doc._id as ObjectId,
      relativePath: doc.relativePath,
      fileName: doc.fileName
    });

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        toRemoveIds.push(doc._id as ObjectId);
      }
    } catch (err) {
      toRemoveIds.push(doc._id as ObjectId);
    }
  }

  let removed = 0;
  if (toRemoveIds.length > 0) {
    const res = await filesCol.deleteMany({
      _id: { $in: toRemoveIds }
    });
    removed = res.deletedCount ?? 0;
  }

  const hasMore =
    checkedDocs.length === limit ||
    (await filesCol.estimatedDocumentCount()) > checkedDocs.length;

  const result: CleanupResult = {
    checked: checkedDocs.length,
    removed,
    limit,
    hasMore
  };

  return Response.json(result);
}

