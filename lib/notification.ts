import { DINGTALK_WEBHOOK } from "./config";
import { FileMeta } from "../types/file";

export async function sendDingTalkNotification(file: FileMeta & { _id?: string }) {
  if (!DINGTALK_WEBHOOK) {
    return;
  }

  const downloadUrl = `https://appcenter.xyplay.cn/api/download?id=${file._id}`;
  const installUrl = `https://appcenter.xyplay.cn`;

  const title = `新版本发布通知: ${file.projectName}`;
  const text = [
    `### ${file.projectName} 新版本发布`,
    `**版本**: ${file.version} (Build: ${file.buildNumber})`,
    `**渠道**: ${file.channel}`,
    `**平台**: ${file.platform === "android" ? "Android" : "iOS"}`,
    `**时间**: ${new Date().toLocaleString()}`,
    file.resVersion ? `**资源**: ${file.resVersion}` : "",
    file.branch ? `**分支**: ${file.branch}` : "",
    `[点击下载](${downloadUrl}) | [查看详情](${installUrl})`
  ].filter(Boolean).join("\n\n");

  const payload = {
    msgtype: "markdown",
    markdown: {
      title,
      text
    }
  };

  try {
    const res = await fetch(DINGTALK_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error("Failed to send DingTalk notification:", await res.text());
    }
  } catch (err) {
    console.error("Error sending DingTalk notification:", err);
  }
}
