import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta, Platform } from "../../../types/file";
import { parseMultipart } from "../../../lib/parse-multipart";
import { sendDingTalkNotification } from "../../../lib/notification";

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

  const harden =
    hardenRaw === "true" || hardenRaw === "1" || hardenRaw === "yes";

  const ext = path.extname(file.originalFilename);
  let fileName = `${projectName}_${version}(${buildNumber})_${channel}`;
  
  if (resVersion) fileName += `_[${resVersion}]`;
  if (areaName) fileName += `_[${areaName}]`;
  if (branch) fileName += `_[${branch}]`;
  if (rbranch) fileName += `_[${rbranch}]`;
  if (sdk) fileName += `_[${sdk}]`;
  if (harden) fileName += `_[harden]`;
  if (codeSignType) fileName += `_[${codeSignType}]`;
  if (appId) fileName += `_[${appId}]`;
  
  fileName += ext;

  const platform = detectPlatform(file.originalFilename);
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
    
    // Check if file already exists in database
    const existingFile = await filesCol.findOne({ relativePath });
    let resultId: string;

    if (existingFile) {
      // Update existing record
      await filesCol.updateOne(
        { _id: existingFile._id },
        { $set: doc }
      );
      resultId = existingFile._id.toString();
    } else {
      // Insert new record
      const result = await filesCol.insertOne(doc as unknown as any);
      resultId = (result.insertedId as ObjectId).toString();
    }

    // Send DingTalk notification
    // Don't await this to avoid delaying the response
    sendDingTalkNotification({ ...doc, _id: resultId }).catch(err => {
      console.error("Async notification error:", err);
    });

    return Response.json({
      ok: true,
      file: {
        ...doc,
        _id: resultId
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
