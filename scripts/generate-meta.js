import fs from "fs";
import path from "path";

const AUDIO_DIR = "public/audio";
const META_PATH = "public/meta.json";

const META_API = "https://id3.cm20121009.workers.dev/meta?file=";
const TIME_API = "https://uploadedat.cm20121009.workers.dev/time?file=";

async function main() {
  const allFilesFlag = process.env.ALL_FILES || "false";
  const changedFilesEnv = process.env.CHANGED_FILES || "";

  const isFullScan = allFilesFlag === "true";

  // 读取现有 meta.json
  let meta = {};
  if (fs.existsSync(META_PATH)) {
    const content = fs.readFileSync(META_PATH, "utf8");
    if (content.trim()) {
      meta = JSON.parse(content);
    }
  }

  // 获取本次需要处理的文件列表
  let toProcess = [];

  if (isFullScan) {
    // 第一次运行或没有上一个 commit 时，全量扫描
    const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"));
    toProcess = files.map(name => ({
      name,
      path: path.join(AUDIO_DIR, name),
    }));
    console.log("Full scan: processing all mp3 files, count:", toProcess.length);
  } else {
    // 只处理变更文件
    const changedFiles = changedFilesEnv
      .split(/\s+/)
      .filter(Boolean)
      .filter(f => f.startsWith("public/audio/") && f.endsWith(".mp3"));

    for (const abs of changedFiles) {
      const name = path.basename(abs);
      toProcess.push({
        name,
        path: abs,
      });
    }
    console.log("Incremental scan: processing changed files, count:", toProcess.length);
  }

  if (toProcess.length === 0) {
    console.log("No mp3 files to process.");
    // 即使没有文件，也保留现有 meta.json
    return;
  }

  // 对每个需要处理的文件调用外部 API
  for (const { name } of toProcess) {
    console.log("Processing:", name);

    const [m, t] = await Promise.all([
      fetch(META_API + encodeURIComponent(name)).then(r => r.json()),
      fetch(TIME_API + encodeURIComponent(name)).then(r => r.json()),
    ]);

    meta[name] = {
      artist: m.artist || "",
      title: m.title || "",
      album: m.album || "",
      uploadedAt: t.uploadedAt || new Date().toISOString(),
    };
  }

  // 可选：清理已经不存在的文件记录
  const currentFiles = new Set(
    fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"))
  );
  for (const key of Object.keys(meta)) {
    if (!currentFiles.has(key)) {
      delete meta[key];
    }
  }

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), "utf8");
  console.log("meta.json updated successfully.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
