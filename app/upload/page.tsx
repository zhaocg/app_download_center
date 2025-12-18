"use client";

import { useState } from "react";

interface UploadState {
  projectName: string;
  version: string;
  buildNumber: string;
  channel: string;
  resVersion: string;
  areaName: string;
  branch: string;
  rbranch: string;
  sdk: string;
  harden: string;
  codeSignType: string;
  appId: string;
  file: File | null;
}

const defaultUploadState: UploadState = {
  projectName: "",
  version: "",
  buildNumber: "",
  channel: "",
  resVersion: "",
  areaName: "",
  branch: "",
  rbranch: "",
  sdk: "",
  harden: "",
  codeSignType: "",
  appId: "",
  file: null
};

export default function UploadPage() {
  const [upload, setUpload] = useState<UploadState>(defaultUploadState);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!upload.file) {
      setMessage("请先选择要上传的文件");
      return;
    }
    if (
      !upload.projectName ||
      !upload.version ||
      !upload.buildNumber ||
      !upload.channel
    ) {
      setMessage("请填写完整的必填项目信息");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", upload.file);
      formData.set("projectName", upload.projectName);
      formData.set("version", upload.version);
      formData.set("buildNumber", upload.buildNumber);
      formData.set("channel", upload.channel);
      formData.set("resVersion", upload.resVersion);
      formData.set("areaName", upload.areaName);
      formData.set("branch", upload.branch);
      formData.set("rbranch", upload.rbranch);
      formData.set("sdk", upload.sdk);
      formData.set("harden", upload.harden);
      formData.set("codeSignType", upload.codeSignType);
      formData.set("appId", upload.appId);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setMessage("上传成功");
      setUpload(defaultUploadState);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "上传失败，请稍后重试"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div className="rounded-md border border-amber-500 bg-amber-950 px-3 py-2 text-sm text-amber-100">
          {message}
        </div>
      )}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <h2 className="mb-3 text-sm font-semibold text-slate-50">
          上传新的安装包
        </h2>
        <form
          className="grid gap-3 text-xs md:grid-cols-2"
          onSubmit={handleUploadSubmit}
        >
          <div className="flex flex-col gap-1">
            <label className="text-slate-300">项目名称 *</label>
            <input
              type="text"
              value={upload.projectName}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  projectName: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="例如 新三国志曹操传"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-300">版本号 *</label>
            <input
              type="text"
              value={upload.version}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  version: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="例如 1.0.0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-300">构建号 *</label>
            <input
              type="text"
              value={upload.buildNumber}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  buildNumber: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="CI 构建号"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-300">渠道名 *</label>
            <input
              type="text"
              value={upload.channel}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  channel: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="例如 GooglePlay"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">资源版本</label>
            <input
              type="text"
              value={upload.resVersion}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  resVersion: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">大区名称</label>
            <input
              type="text"
              value={upload.areaName}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  areaName: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">分支名</label>
            <input
              type="text"
              value={upload.branch}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  branch: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">资源分支名</label>
            <input
              type="text"
              value={upload.rbranch}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  rbranch: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">SDK 类型</label>
            <input
              type="text"
              value={upload.sdk}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  sdk: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">签名类型</label>
            <input
              type="text"
              value={upload.codeSignType}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  codeSignType: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500">App ID</label>
            <input
              type="text"
              value={upload.appId}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  appId: e.target.value
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="harden"
              checked={upload.harden === "true"}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  harden: e.target.checked ? "true" : ""
                }))
              }
              className="rounded border-slate-700 bg-slate-950"
            />
            <label htmlFor="harden" className="text-slate-500">
              是否加固
            </label>
          </div>
          <div className="col-span-full flex flex-col gap-1">
            <label className="text-slate-300">选择文件 *</label>
            <input
              type="file"
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  file: e.target.files?.[0] || null
                }))
              }
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              required
            />
          </div>
          <div className="col-span-full mt-2">
            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading ? "上传中..." : "开始上传"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
