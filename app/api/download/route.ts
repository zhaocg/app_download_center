import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";

function detectContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".apk")) {
    return "application/vnd.android.package-archive";
  }
  if (lower.endsWith(".ipa")) {
    return "application/octet-stream";
  }
  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return new Response("缺少文件标识", { status: 400 });
  }

  const filesCol = await getFilesCollection();
  const doc = await filesCol.findOne({ _id: new ObjectId(id) });
  if (!doc) {
    return new Response("文件不存在", { status: 404 });
  }

  const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
  
  // Use stat to get file size and verify existence
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return new Response("文件不存在", { status: 404 });
    }
    
    // Create a read stream
    const fileStream = await fs.open(filePath);
    // @ts-ignore
    const stream = fileStream.createReadStream();

    const contentType = detectContentType(doc.fileName);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          doc.fileName
        )}"`
      }
    });
  } catch (err) {
    return new Response("文件读取失败", { status: 500 });
  }
}

