import { MongoClient, ObjectId } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
const DOWNLOAD_ROOT = process.env.DOWNLOAD_ROOT;

if (!MONGODB_URI) {
  console.error("Please define MONGODB_URI in .env file");
  process.exit(1);
}

if (!DOWNLOAD_ROOT) {
  console.error("Please define DOWNLOAD_ROOT in .env file");
  process.exit(1);
}

const SAMPLE_PROJECTS = ["新三国志曹操传", "银河战舰", "无尽的拉格朗日"];
const CHANNELS = ["official", "googleplay", "appstore", "tap"];
const PLATFORMS = ["android", "ios"];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("Connecting to MongoDB...", MONGODB_URI);
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db();
  const collection = db.collection("files");

  // Clear existing data? Maybe not, just append for now or the user might lose data if they had any.
  // But user asked to "add" data.
  
  const docs = [];

  console.log("Generating test data...");

  for (let i = 0; i < 20; i++) {
    const projectName = getRandomItem(SAMPLE_PROJECTS);
    const version = `1.${getRandomInt(0, 9)}.${getRandomInt(0, 99)}`;
    const buildNumber = String(getRandomInt(1000, 9999));
    const channel = getRandomItem(CHANNELS);
    const platform = getRandomItem(PLATFORMS);
    const ext = platform === "android" ? "apk" : "ipa";
    const fileName = `${projectName}_v${version}_b${buildNumber}_${channel}.${ext}`;
    
    // Create directory structure
    const relativePath = path.join(projectName, version, channel, fileName);
    const fullPath = path.join(DOWNLOAD_ROOT as string, relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create dummy file
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, `Dummy content for ${fileName}`);
    }

    const doc = {
      projectName,
      version,
      channel,
      buildNumber,
      fileName,
      relativePath, // Store with OS specific separator? 
                   // The app uses path.join which adapts to OS. 
                   // But storing in DB, usually better to normalize.
                   // However, existing code uses path.join to create relativePath on upload.
                   // So it will be backslashes on Windows.
      platform,
      size: getRandomInt(1024 * 1024 * 10, 1024 * 1024 * 100), // 10MB - 100MB
      uploadedAt: new Date(Date.now() - getRandomInt(0, 10000000000)).toISOString(),
      resVersion: `1.0.${getRandomInt(0, 20)}`,
      areaName: getRandomInt(0, 1) ? "Global" : "CN",
      branch: "release/v" + version,
      rbranch: "release/res_v" + version,
      sdk: "1.2.3",
      harden: Math.random() > 0.5,
      codeSignType: "enterprise",
      appId: `com.company.${projectName}.${channel}`
    };
    
    docs.push(doc);
  }

  if (docs.length > 0) {
    await collection.insertMany(docs);
    console.log(`Inserted ${docs.length} documents.`);
  }

  await client.close();
  console.log("Done!");
}

seed().catch(console.error);
