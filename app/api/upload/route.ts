import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta, Platform } from "../../../types/file";

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
  const form = await req.formData();
  const file = form.get("file");
  const projectName = String(form.get("projectName") || "").trim();
  const version = String(form.get("version") || "").trim();
  const buildNumber = String(form.get("buildNumber") || "").trim();
  const channel = String(form.get("channel") || "").trim();
  const resVersion = String(form.get("resVersion") || "").trim() || undefined;
  const areaName = String(form.get("areaName") || "").trim() || undefined;
  const branch = String(form.get("branch") || "").trim() || undefined;
  const rbranch = String(form.get("rbranch") || "").trim() || undefined;
  const sdk = String(form.get("sdk") || "").trim() || undefined;
  const hardenRaw = String(form.get("harden") || "").trim();
  const codeSignType =
    String(form.get("codeSignType") || "").trim() || undefined;
  const appId = String(form.get("appId") || "").trim() || undefined;

  if (!file || typeof file === "string") {
    return new Response("缺少文件", { status: 400 });
  }
  if (!projectName || !version || !buildNumber || !channel) {
    return new Response("缺少必要的项目信息", { status: 400 });
  }

  const fileName = file.name;
  const platform = detectPlatform(fileName);
  if (!platform) {
    return new Response("仅支持上传 APK 或 IPA 文件", { status: 400 });
  }

  const projectDir = path.join(DOWNLOAD_ROOT, projectName);
  const destDir = path.join(projectDir, version, channel);
  await fs.mkdir(destDir, { recursive: true });

  const destPath = path.join(destDir, fileName);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(destPath, buffer);

  const size = buffer.byteLength;
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
}

