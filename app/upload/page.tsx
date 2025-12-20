"use client";

import { useState } from "react";
import { useToast } from "../components/Toast";

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
  const toast = useToast();

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!upload.file) {
      toast.error("请先选择要上传的文件");
      return;
    }
    if (
      !upload.projectName ||
      !upload.version ||
      !upload.buildNumber ||
      !upload.channel
    ) {
      toast.error("请填写完整的必填项目信息");
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
      toast.success("上传成功");
      setUpload(defaultUploadState);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "上传失败，请稍后重试"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          上传新的安装包
        </h2>
        <form
          className="grid gap-3 text-xs md:grid-cols-2"
          onSubmit={handleUploadSubmit}
        >
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">项目名称 *</label>
            <input
              type="text"
              value={upload.projectName}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  projectName: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              placeholder="例如 新三国志曹操传"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">版本号 *</label>
            <input
              type="text"
              value={upload.version}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  version: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              placeholder="例如 1.0.0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">构建号 *</label>
            <input
              type="text"
              value={upload.buildNumber}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  buildNumber: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              placeholder="CI 构建号"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-800">渠道名 *</label>
            <input
              type="text"
              value={upload.channel}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  channel: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              placeholder="例如 GooglePlay"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">资源版本</label>
            <input
              type="text"
              value={upload.resVersion}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  resVersion: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">大区名称</label>
            <input
              type="text"
              value={upload.areaName}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  areaName: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">分支名</label>
            <input
              type="text"
              value={upload.branch}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  branch: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">资源分支名</label>
            <input
              type="text"
              value={upload.rbranch}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  rbranch: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">SDK 类型</label>
            <input
              type="text"
              value={upload.sdk}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  sdk: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">签名类型</label>
            <input
              type="text"
              value={upload.codeSignType}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  codeSignType: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-700">App ID</label>
            <input
              type="text"
              value={upload.appId}
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  appId: e.target.value
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
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
              className="rounded border-slate-300 bg-white"
            />
            <label htmlFor="harden" className="text-slate-700">
              是否加固
            </label>
          </div>
          <div className="col-span-full flex flex-col gap-1">
            <label className="text-slate-800">选择文件 *</label>
            <input
              type="file"
              onChange={(e) =>
                setUpload((prev) => ({
                  ...prev,
                  file: e.target.files?.[0] || null
                }))
              }
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              required
            />
          </div>
          <div className="col-span-full mt-2">
            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading ? "正在上传..." : "上传"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          API 接入文档
        </h2>
        <div className="prose prose-sm prose-slate max-w-none text-xs">
          <p>
            本平台支持通过 API 自动化上传安装包，适用于 CI/CD 流程集成。
          </p>
          
          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            接口地址
          </h3>
          <div className="mt-2 rounded bg-slate-100 p-2 font-mono text-slate-600">
            POST /api/upload
          </div>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            请求方式
          </h3>
          <p className="mt-1">
            multipart/form-data
          </p>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            必需参数
          </h3>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><code className="bg-slate-100 px-1 rounded">file</code>: 安装包文件（.apk 或 .ipa）</li>
            <li><code className="bg-slate-100 px-1 rounded">projectName</code>: 项目名称</li>
            <li><code className="bg-slate-100 px-1 rounded">version</code>: 版本号（如 1.0.0）</li>
            <li><code className="bg-slate-100 px-1 rounded">buildNumber</code>: 构建号（如 100）</li>
            <li><code className="bg-slate-100 px-1 rounded">channel</code>: 渠道名称（如 GooglePlay）</li>
          </ul>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            可选参数
          </h3>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><code className="bg-slate-100 px-1 rounded">resVersion</code>: 资源版本</li>
            <li><code className="bg-slate-100 px-1 rounded">areaName</code>: 大区名称</li>
            <li><code className="bg-slate-100 px-1 rounded">branch</code>: 代码分支</li>
            <li><code className="bg-slate-100 px-1 rounded">rbranch</code>: 资源分支</li>
            <li><code className="bg-slate-100 px-1 rounded">sdk</code>: SDK 类型</li>
            <li><code className="bg-slate-100 px-1 rounded">harden</code>: 是否加固（true/false/1/0）</li>
            <li><code className="bg-slate-100 px-1 rounded">codeSignType</code>: 签名类型</li>
            <li><code className="bg-slate-100 px-1 rounded">appId</code>: App Bundle ID（iOS 安装必需）</li>
          </ul>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            cURL 示例
          </h3>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-slate-50">
{`curl -X POST \\
  -F "file=@/path/to/game.apk" \\
  -F "projectName=MyGame" \\
  -F "version=1.0.0" \\
  -F "buildNumber=101" \\
  -F "channel=Official" \\
  https://appcenter.xyplay.cn/v2/api/upload`}
          </pre>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            TypeScript (Node.js) 示例
          </h3>
          <p className="mt-1 text-slate-600">
            推荐使用 <code className="bg-slate-100 px-1 rounded">axios</code> 配合 <code className="bg-slate-100 px-1 rounded">form-data</code> 库进行流式上传，它能自动处理复杂的网络环境（如代理、SSL）。
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-slate-50">
{`import axios from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';

async function uploadApp() {
  const formData = new FormData();
  // 使用 createReadStream 流式上传
  formData.append('file', fs.createReadStream('./game.apk'));
  formData.append('projectName', 'MyGame');
  formData.append('version', '1.0.0');
  formData.append('buildNumber', '101');
  formData.append('channel', 'Official');

  try {
    const response = await axios.post('https://appcenter.xyplay.cn/v2/api/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      // 设置最大内容长度为 Infinity 以支持大文件
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

uploadApp();`}
          </pre>

          <h3 className="mt-4 text-xs font-semibold text-slate-800">
            Python (Requests) 示例
          </h3>
          <p className="mt-1 text-slate-600">
            Python 的 <code className="bg-slate-100 px-1 rounded">requests</code> 库默认支持流式上传。
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-slate-50">
{`import requests
from requests_toolbelt.multipart.encoder import MultipartEncoder

def upload_app():
    url = 'https://appcenter.xyplay.cn/v2/api/upload'
    
    # 使用 MultipartEncoder 可以更好地处理大文件流式上传，避免一次性加载到内存
    # pip install requests-toolbelt
    
    m = MultipartEncoder(
        fields={
            'projectName': 'MyGame',
            'version': '1.0.0',
            'buildNumber': '101',
            'channel': 'Official',
            'file': ('game.apk', open('./game.apk', 'rb'), 'application/vnd.android.package-archive')
        }
    )

    response = requests.post(url, data=m, headers={'Content-Type': m.content_type})
    print(response.json())

if __name__ == '__main__':
    upload_app()`}
          </pre>
        </div>
      </div>
    </div>
  );
}
