import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta, SortField, SortOrder } from "../../../types/file";

type Level = "project" | "version" | "channel" | "file";

type BrowseEntry =
  | {
      type: "project";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "version";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "channel";
      name: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }
  | {
      type: "file";
      file: FileMeta;
    };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const project = searchParams.get("project") || undefined;
  const version = searchParams.get("version") || undefined;
  const channel = searchParams.get("channel") || undefined;
  const sortField = (searchParams.get("sortField") || "uploadedAt") as SortField;
  const sortOrder = (searchParams.get("sortOrder") || "desc") as SortOrder;

  const filesCol = await getFilesCollection();

  let level: Level;
  if (!project) {
    level = "project";
  } else if (project && !version) {
    level = "version";
  } else if (project && version && !channel) {
    level = "channel";
  } else {
    level = "file";
  }

  if (level === "project") {
    const cursor = filesCol.aggregate<{
      _id: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }>([
      {
        $group: {
          _id: "$projectName",
          latestUploadedAt: { $max: "$uploadedAt" },
          fileCount: { $sum: 1 }
        }
      }
    ]);
    const groups = await cursor.toArray();
    const entries: BrowseEntry[] = groups
      .map((g) => ({
        type: "project" as const,
        name: g._id,
        latestUploadedAt: g.latestUploadedAt,
        fileCount: g.fileCount
      }))
      .sort((a, b) => {
        if (sortField === "name") {
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name, "zh-CN")
            : b.name.localeCompare(a.name, "zh-CN");
        }
        if (!a.latestUploadedAt || !b.latestUploadedAt) {
          return 0;
        }
        const av = new Date(a.latestUploadedAt).getTime();
        const bv = new Date(b.latestUploadedAt).getTime();
        return sortOrder === "asc" ? av - bv : bv - av;
      });

    return Response.json({ level, entries });
  }

  if (level === "version") {
    const cursor = filesCol.aggregate<{
      _id: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }>([
      { $match: { projectName: project } },
      {
        $group: {
          _id: "$version",
          latestUploadedAt: { $max: "$uploadedAt" },
          fileCount: { $sum: 1 }
        }
      }
    ]);
    const groups = await cursor.toArray();
    const entries: BrowseEntry[] = groups
      .map((g) => ({
        type: "version" as const,
        name: g._id,
        latestUploadedAt: g.latestUploadedAt,
        fileCount: g.fileCount
      }))
      .sort((a, b) => {
        if (sortField === "name") {
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name, "zh-CN")
            : b.name.localeCompare(a.name, "zh-CN");
        }
        if (!a.latestUploadedAt || !b.latestUploadedAt) {
          return 0;
        }
        const av = new Date(a.latestUploadedAt).getTime();
        const bv = new Date(b.latestUploadedAt).getTime();
        return sortOrder === "asc" ? av - bv : bv - av;
      });

    return Response.json({ level, project, entries });
  }

  if (level === "channel") {
    const cursor = filesCol.aggregate<{
      _id: string;
      latestUploadedAt: string | null;
      fileCount: number;
    }>([
      { $match: { projectName: project, version } },
      {
        $group: {
          _id: "$channel",
          latestUploadedAt: { $max: "$uploadedAt" },
          fileCount: { $sum: 1 }
        }
      }
    ]);
    const groups = await cursor.toArray();
    const entries: BrowseEntry[] = groups
      .map((g) => ({
        type: "channel" as const,
        name: g._id,
        latestUploadedAt: g.latestUploadedAt,
        fileCount: g.fileCount
      }))
      .sort((a, b) => {
        if (sortField === "name") {
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name, "zh-CN")
            : b.name.localeCompare(a.name, "zh-CN");
        }
        if (!a.latestUploadedAt || !b.latestUploadedAt) {
          return 0;
        }
        const av = new Date(a.latestUploadedAt).getTime();
        const bv = new Date(b.latestUploadedAt).getTime();
        return sortOrder === "asc" ? av - bv : bv - av;
      });

    return Response.json({ level, project, version, entries });
  }

  const query: Record<string, string> = {};
  if (project) {
    query.projectName = project;
  }
  if (version) {
    query.version = version;
  }
  if (channel) {
    query.channel = channel;
  }
  const sortOption: Record<string, 1 | -1> = {};
  if (sortField === "name") {
    sortOption.fileName = sortOrder === "asc" ? 1 : -1;
  } else if (sortField === "size") {
    sortOption.size = sortOrder === "asc" ? 1 : -1;
  } else {
    sortOption.uploadedAt = sortOrder === "asc" ? 1 : -1;
  }

  const docs = await filesCol
    .find(query)
    .sort(sortOption)
    .toArray();

  const entries: BrowseEntry[] = docs.map((doc) => ({
    type: "file",
    file: {
      ...doc,
      _id: (doc as unknown as { _id: ObjectId })._id.toString()
    }
  }));

  return Response.json({
    level,
    project,
    version,
    channel,
    entries
  });
}

