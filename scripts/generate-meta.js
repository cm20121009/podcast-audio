import fs from "fs";

const AUDIO_DIR = "public/audio";
const META_API = "https://id3.cm20121009.workers.dev/meta?file=";
const TIME_API = "https://uploadedat.cm20121009.workers.dev/time?file=";

async function main() {
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"));
  const meta = {};

  for (const file of files) {
    console.log("Processing:", file);

    const m = await fetch(META_API + file).then(r => r.json());
    const t = await fetch(TIME_API + file).then(r => r.json());

    meta[file] = {
      artist: m.artist || "",
      title: m.title || "",
      album: m.album || "",
      uploadedAt: t.uploadedAt || new Date().toISOString()
    };
  }

  fs.writeFileSync("public/meta.json", JSON.stringify(meta, null, 2));
  console.log("meta.json generated successfully.");
}

main();
