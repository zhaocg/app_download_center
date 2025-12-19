import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { ReadableOptions } from "stream";

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

// Helper to convert Node.js ReadStream to Web ReadableStream
function streamFile(path: string): ReadableStream {
  const downloadStream = createReadStream(path);
  
  return new ReadableStream({
    start(controller) {
      downloadStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      downloadStream.on("end", () => controller.close());
      downloadStream.on("error", (error: Error) => controller.error(error));
    },
    cancel() {
      downloadStream.destroy();
    },
  });
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
    console.warn("[download] document not found", { id });
    return new Response("文件不存在", { status: 404 });
  }

  let filePath = "";
  try {
    filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      console.warn("[download] path is not a file", { id, filePath });
      return new Response("文件不存在", { status: 404 });
    }

    const stream = streamFile(filePath);

    const contentType = detectContentType(doc.fileName);
    const encodedFileName = encodeURIComponent(doc.fileName);
    const contentDisposition = `attachment; filename*=UTF-8''${encodedFileName}`;

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Content-Disposition": contentDisposition
      }
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as any).code;
      if (code === "ENOENT" || code === "ENOTDIR") {
        console.warn("[download] file not found on disk", {
          id,
          filePath,
          code
        });
        return new Response("文件不存在", { status: 404 });
      }
    }
    console.error("[download] file read failed", {
      id,
      filePath,
      error:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              stack: err.stack
            }
          : err
    });
    return new Response("文件读取失败", { status: 500 });
  }
}
