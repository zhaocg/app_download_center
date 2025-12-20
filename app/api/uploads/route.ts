import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getFilesCollection } from "../../../lib/db";
import { FileMeta } from "../../../types/file";

export const dynamic = "force-dynamic";

interface UploadItem extends FileMeta {
  _id: string;
}

interface UploadsResponse {
  items: UploadItem[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get("limit");
  const project = searchParams.get("project") || undefined;

  let limit = 50;
  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(Math.floor(parsed), 200);
    }
  }

  const query: Record<string, unknown> = {};
  if (project) {
    query.projectName = project;
  }

  const filesCol = await getFilesCollection();
  const docs = await filesCol
    .find(query)
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .toArray();

  const items: UploadItem[] = docs.map((doc) => {
    const id = (doc as unknown as { _id: ObjectId })._id.toString();
    const { _id, ...rest } = doc as any;
    return {
      ...(rest as FileMeta),
      _id: id
    };
  });

  const response: UploadsResponse = {
    items
  };

  return Response.json(response);
}

