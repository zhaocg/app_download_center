import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getFilesCollection } from "../../../lib/db";
import { QRCodeView } from "../../components/QRCode";

interface SharePageProps {
  params: {
    shareId: string;
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const filesCol = await getFilesCollection();
  const doc = await filesCol.findOne({ shareId: params.shareId });
  if (!doc) {
    notFound();
  }

  const id = (doc._id as ObjectId).toString();
  const hdrs = headers();
  const host = hdrs.get("host") || "";
  const proto = hdrs.get("x-forwarded-proto") || "http";
  const origin = `${proto}://${host}`;
  const downloadUrl = `${origin}/api/download?id=${id}`;
  const manifestUrl = `${origin}/api/ios/manifest?id=${id}`;
  const isAndroid = doc.platform === "android";
  const isIos = doc.platform === "ios";
  
  let qrCodeUrl = downloadUrl;
  if (isIos) {
    qrCodeUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(
      manifestUrl
    )}`;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              {doc.projectName}
            </h1>
            <p className="text-xs text-slate-600">
              版本 {doc.version} · 渠道 {doc.channel}
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-700">
            {isAndroid ? "Android" : isIos ? "iOS" : "未知平台"}
          </div>
        </div>
        <div className="mb-4 space-y-1 text-xs text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">文件名</span>
            <span className="max-w-[60%] truncate text-right">
              {doc.fileName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">大小</span>
            <span>
              {(doc.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">上传时间</span>
            <span>
              {new Date(doc.uploadedAt).toLocaleString()}
            </span>
          </div>
          {doc.appId && (
            <div className="flex justify-between">
              <span className="text-slate-500">App Id</span>
              <span className="max-w-[60%] truncate text-right">
                {doc.appId}
              </span>
            </div>
          )}
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-slate-700">
          {doc.resVersion && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              资源 {doc.resVersion}
            </span>
          )}
          {doc.areaName && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              大区 {doc.areaName}
            </span>
          )}
          {doc.branch && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              分支 {doc.branch}
            </span>
          )}
          {doc.rbranch && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              资源分支 {doc.rbranch}
            </span>
          )}
          {doc.sdk && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              SDK {doc.sdk}
            </span>
          )}
          {doc.harden && (
            <span className="rounded-full bg-emerald-600/10 px-2 py-1 text-emerald-700">
              已加固
            </span>
          )}
          {doc.codeSignType && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              签名 {doc.codeSignType}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={downloadUrl}
            className="flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            下载安装包
          </a>
          {isAndroid && (
            <p className="text-center text-[10px] text-slate-500">
              在安卓手机浏览器中打开本页，点击上方按钮即可下载安装包。
            </p>
          )}
          {isIos && (
            <>
              <a
                href={`itms-services://?action=download-manifest&url=${encodeURIComponent(
                  manifestUrl
                )}`}
                className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                安装到 iOS 设备
              </a>
              <p className="text-center text-[10px] text-slate-500">
                需要在企业签名环境下，通过 Safari 打开本页，点击安装按钮完成安装。
              </p>
            </>
          )}
          <div className="mt-2 flex flex-col items-center gap-2 border-t border-slate-100 pt-4">
            <QRCodeView url={qrCodeUrl} size={140} />
            <p className="text-[10px] text-slate-400">
              扫码直接下载/安装
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
