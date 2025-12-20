import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
// @ts-ignore
import AppInfoParser from "app-info-parser";

export const dynamic = "force-dynamic";

const DEFAULT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#94a3b8">
  <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.472V5.258a.75.75 0 00-1-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
</svg>
`.trim();

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

  // If icon is already stored in DB as base64 or path, use it (future optimization)
  if (doc.icon) {
    // If it's a data URL, return it
    if (doc.icon.startsWith("data:")) {
        const base64Data = doc.icon.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        return new Response(buffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000",
            },
        });
    }
  }

  const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);

  try {
    const parser = new AppInfoParser(filePath);
    const result = await parser.parse();
    
    // AppInfoParser returns icon as base64 string in result.icon
    if (result.icon) {
        // Cache icon in DB for future requests
        await filesCol.updateOne(
            { _id: doc._id },
            { $set: { icon: result.icon } }
        );

        const base64Data = result.icon.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        
        return new Response(buffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=31536000",
            },
        });
    }
    
    // No icon found in file, return 404 to let frontend handle fallback
    return new Response(null, { status: 404 });

  } catch (error) {
    console.error("Icon extraction failed:", error);
    // Return 404 on error to let frontend handle fallback
    return new Response(null, { status: 404 });
  }
}
