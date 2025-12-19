import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";

async function cleanupEmptyDirs(filePath: string) {
  let dir = path.dirname(path.resolve(filePath));
  const root = path.resolve(DOWNLOAD_ROOT);
  
  // 在手动删除文件后递归清理父目录时，不应用时间阈值。
  // 因为如果子文件被删除了，父目录的 mtime 会更新为当前时间。
  // 如果应用阈值，刚刚变空的父目录将无法被删除。
  while (dir.startsWith(root)) {
    if (dir === root) {
      break;
    }
    // 防止删除 root 本身或跳出 root
    if (!dir.startsWith(root) || dir === root) {
      break;
    }
    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) {
        break;
      }
      // 不检查 mtime，直接删除空目录
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch (err) {
      break;
    }
  }
}

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
    await cleanupEmptyDirs(filePath);
  } catch (err) {}

  await filesCol.deleteOne({ _id: new ObjectId(id) });

  return Response.json({ ok: true });
}
