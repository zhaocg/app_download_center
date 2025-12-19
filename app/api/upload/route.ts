import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta, Platform } from "../../../types/file";
import { parseMultipart } from "../../../lib/parse-multipart";

function detectPlatform(fileName: string): Platform | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".apk")) {
    return "android";
  }
  if (lower.endsWith(".ipa")) {
    return "ios";
  }
  return null;
}

export async function POST(req: NextRequest) {
  let parsedData;
  try {
    parsedData = await parseMultipart(req);
  } catch (err) {
    console.error("Multipart parse error:", err);
    return new Response(
      `表单解析失败: ${err instanceof Error ? err.message : String(err)}`,
      { status: 400 }
    );
  }

  const { fields, files } = parsedData;
  const file = files[0]; // Assume single file upload for now

  if (!file) {
    return new Response("缺少文件", { status: 400 });
  }

  const projectName = (fields.projectName || "").trim();
  const version = (fields.version || "").trim();
  const buildNumber = (fields.buildNumber || "").trim();
  const channel = (fields.channel || "").trim();
  const resVersion = (fields.resVersion || "").trim() || undefined;
  const areaName = (fields.areaName || "").trim() || undefined;
  const branch = (fields.branch || "").trim() || undefined;
  const rbranch = (fields.rbranch || "").trim() || undefined;
  const sdk = (fields.sdk || "").trim() || undefined;
  const hardenRaw = (fields.harden || "").trim();
  const codeSignType = (fields.codeSignType || "").trim() || undefined;
  const appId = (fields.appId || "").trim() || undefined;

  if (!projectName || !version || !buildNumber || !channel) {
    // Cleanup temp file if validation fails
    try {
      await fs.unlink(file.path);
    } catch (e) {
      console.error("Failed to delete temp file:", e);
    }
    return new Response("缺少必要的项目信息", { status: 400 });
  }

  const fileName = file.originalFilename;
  const platform = detectPlatform(fileName);
  if (!platform) {
    try {
      await fs.unlink(file.path);
    } catch (e) {
      console.error("Failed to delete temp file:", e);
    }
    return new Response("仅支持上传 APK 或 IPA 文件", { status: 400 });
  }

  const projectDir = path.join(DOWNLOAD_ROOT, projectName);
  const destDir = path.join(projectDir, version, channel);
  
  try {
    await fs.mkdir(destDir, { recursive: true });
    
    const destPath = path.join(destDir, fileName);
    
    // Move file from temp to destination
    // Handle EXDEV: cross-device link not permitted (e.g. temp on C:, dest on E:)
    try {
      await fs.rename(file.path, destPath);
    } catch (err: any) {
      if (err.code === "EXDEV") {
        await fs.copyFile(file.path, destPath);
        await fs.unlink(file.path);
      } else {
        throw err;
      }
    }

    const size = file.size;
    const uploadedAt = new Date().toISOString();
    const relativePath = path.join(projectName, version, channel, fileName);
    const harden =
      hardenRaw === "true" || hardenRaw === "1" || hardenRaw === "yes";

    const doc: FileMeta = {
      projectName,
      version,
      channel,
      buildNumber,
      fileName,
      relativePath,
      platform,
      size,
      uploadedAt,
      resVersion,
      areaName,
      branch,
      rbranch,
      sdk,
      harden,
      codeSignType,
      appId
    };

    const filesCol = await getFilesCollection();
    const result = await filesCol.insertOne(doc as unknown as any);

    return Response.json({
      ok: true,
      file: {
        ...doc,
        _id: (result.insertedId as ObjectId).toString()
      }
    });
  } catch (err) {
    // Cleanup on error
    try {
      // Check if temp file still exists and delete it
      await fs.access(file.path).then(() => fs.unlink(file.path)).catch(() => {});
    } catch (e) {
      // Ignore
    }
    console.error("Upload processing error:", err);
    return new Response("文件保存失败", { status: 500 });
  }
}
