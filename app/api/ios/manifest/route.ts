import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getFilesCollection } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return new Response("缺少文件标识", { status: 400 });
  }

  const filesCol = await getFilesCollection();
  const doc = await filesCol.findOne({ _id: new ObjectId(id) });
  if (!doc) {
    return new Response("未找到文件", { status: 404 });
  }
  if (doc.platform !== "ios") {
    return new Response("仅支持 iOS 安装清单", { status: 400 });
  }
  if (!doc.appId) {
    return new Response("缺少 appId，无法生成安装清单", { status: 400 });
  }

  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const ipaUrl = `${origin}/api/download?id=${id}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${ipaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${doc.appId}</string>
        <key>bundle-version</key>
        <string>${doc.version}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${doc.projectName}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}

