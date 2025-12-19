import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { DOWNLOAD_ROOT } from "../../../lib/config";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta } from "../../../types/file";

type ClearMode = "time" | "project" | "projectVersion";

interface ClearRequestBody {
  mode: ClearMode;
  before?: string;
  projectName?: string;
  version?: string;
  dryRun?: boolean;
}

interface ClearSampleItem {
  id: string;
  projectName: string;
  version: string;
  channel: string;
  fileName: string;
  uploadedAt: string;
}

interface ClearResponseBody {
  ok: boolean;
  matched: number;
  deleted: number;
  totalSize: number;
  sample: ClearSampleItem[];
}

async function cleanupEmptyDirs(filePath: string) {
  let dir = path.dirname(path.resolve(filePath));
  const root = path.resolve(DOWNLOAD_ROOT);
  const thresholdMs = 60 * 1000;
  while (dir.startsWith(root)) {
    if (dir === root) {
      break;
    }
    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) {
        break;
      }
      const stats = await fs.stat(dir);
      const age = Date.now() - stats.mtimeMs;
      if (age < thresholdMs) {
        break;
      }
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch (err) {
      break;
    }
  }
}

export async function POST(req: NextRequest) {
  let body: ClearRequestBody;
  try {
    body = (await req.json()) as ClearRequestBody;
  } catch (err) {
    return new Response("请求体格式错误", { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "time" && mode !== "project" && mode !== "projectVersion") {
    return new Response("无效的清理模式", { status: 400 });
  }

  const query: Record<string, unknown> = {};

  if (mode === "time") {
    if (!body.before) {
      return new Response("按时间清理需要提供 before 参数", { status: 400 });
    }
    query.uploadedAt = { $lt: body.before };
  } else if (mode === "project") {
    if (!body.projectName) {
      return new Response("按项目清理需要提供 projectName 参数", {
        status: 400
      });
    }
    query.projectName = body.projectName;
    if (body.before) {
      query.uploadedAt = { $lt: body.before };
    }
  } else if (mode === "projectVersion") {
    if (!body.projectName || !body.version) {
      return new Response("按项目+版本清理需要提供 projectName 和 version 参数", {
        status: 400
      });
    }
    query.projectName = body.projectName;
    query.version = body.version;
    if (body.before) {
      query.uploadedAt = { $lt: body.before };
    }
  }

  const filesCol = await getFilesCollection();
  const docs = (await filesCol.find(query).toArray()) as (FileMeta & {
    _id: ObjectId;
  })[];

  if (!docs.length) {
    const emptyResult: ClearResponseBody = {
      ok: true,
      matched: 0,
      deleted: 0,
      totalSize: 0,
      sample: []
    };
    return Response.json(emptyResult);
  }

  const dryRun = Boolean(body.dryRun);
  const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);

  if (!dryRun) {
    for (const doc of docs) {
      const filePath = path.join(DOWNLOAD_ROOT, doc.relativePath);
      try {
        await fs.unlink(filePath);
        await cleanupEmptyDirs(filePath);
      } catch (err) {}
    }
    const ids = docs.map((d) => d._id);
    const res = await filesCol.deleteMany({
      _id: { $in: ids }
    });
    const result: ClearResponseBody = {
      ok: true,
      matched: docs.length,
      deleted: res.deletedCount ?? 0,
      totalSize,
      sample: docs.slice(0, 20).map((d) => ({
        id: String(d._id),
        projectName: d.projectName,
        version: d.version,
        channel: d.channel,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt
      }))
    };
    return Response.json(result);
  }

  const dryResult: ClearResponseBody = {
    ok: true,
    matched: docs.length,
    deleted: 0,
    totalSize,
    sample: docs.slice(0, 20).map((d) => ({
      id: String(d._id),
      projectName: d.projectName,
      version: d.version,
      channel: d.channel,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt
    }))
  };

  return Response.json(dryResult);
}
