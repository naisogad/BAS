#!/usr/bin/env node
/**
 * Reusable Windows Local Studio Packager & Offline Integrity Verifier
 * Aligned cleanly with manifests/episode_manifest_template.json
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Buffer(chunk) {
  let c = 0xffffffff;
  for (let i = 0; i < chunk.length; i++) {
    c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function encodeDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    dosTime: ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f),
    dosDate: (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f),
  };
}

function writeStoreZipAtomic(entries, outZipPath) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const data = fs.readFileSync(entry.absPath);
    const stat = fs.statSync(entry.absPath);
    const nameBytes = Buffer.from(entry.archivePath, "utf8");
    const crc = crc32Buffer(data);
    const { dosTime, dosDate } = encodeDosDateTime(stat.mtime);

    const lh = Buffer.alloc(30 + nameBytes.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBytes.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBytes.copy(lh, 30);

    const cdh = Buffer.alloc(46 + nameBytes.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(0, 10);
    cdh.writeUInt16LE(dosTime, 12);
    cdh.writeUInt16LE(dosDate, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(data.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBytes.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);
    nameBytes.copy(cdh, 46);

    localParts.push(lh, data);
    cdParts.push(cdh);
    offset += lh.length + data.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outZipPath), { recursive: true });
  const tmpPath = `${outZipPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, Buffer.concat([...localParts, cdBuf, eocd]));
  fs.renameSync(tmpPath, outZipPath);
}

function inspectWav(wavPath) {
  const probeJson = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_name,sample_rate,channels,bits_per_sample,duration_ts,duration",
      "-of",
      "json",
      wavPath,
    ],
    { encoding: "utf-8", timeout: 15000 }
  );
  const stream = JSON.parse(probeJson).streams?.[0];
  if (!stream) throw new Error(`Missing audio stream in ${wavPath}`);
  return {
    codecName: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    bitsPerSample: Number(stream.bits_per_sample || 24),
    sampleCountPerChannel: Number(stream.duration_ts),
    durationSec: Number(stream.duration),
  };
}

function parseCliArgs(argv) {
  const opts = {
    episodeId: "epXX",
    renderId: "01",
    title: "Render 01",
    durationSec: 0,
    masterStartSec: 0,
    isFinalSegment: false,
    htmlPath: "",
    wavPath: "",
    eventsPath: "",
    threePath: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--episode" && argv[i + 1]) opts.episodeId = argv[++i];
    else if (a === "--render" && argv[i + 1]) opts.renderId = argv[++i];
    else if (a === "--title" && argv[i + 1]) opts.title = argv[++i];
    else if (a === "--duration" && argv[i + 1]) opts.durationSec = Number(argv[++i]);
    else if (a === "--master-start" && argv[i + 1]) opts.masterStartSec = Number(argv[++i]);
    else if (a === "--final") opts.isFinalSegment = true;
    else if (a === "--html" && argv[i + 1]) opts.htmlPath = path.resolve(argv[++i]);
    else if (a === "--wav" && argv[i + 1]) opts.wavPath = path.resolve(argv[++i]);
    else if (a === "--events" && argv[i + 1]) opts.eventsPath = path.resolve(argv[++i]);
    else if (a === "--three" && argv[i + 1]) opts.threePath = path.resolve(argv[++i]);
  }
  return opts;
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (!opts.durationSec || opts.durationSec <= 0) {
    throw new Error("Provide script-driven --duration <seconds> (> 0).");
  }
  const rootDir = process.cwd();
  const pkgDir = path.join(rootDir, "output", "local_studio", `render${opts.renderId}`);
  const assetsDir = path.join(pkgDir, "assets");
  const htmlName = `render${opts.renderId}.html`;
  const wavName = `render${opts.renderId}_sfx.wav`;
  const eventsName = `render${opts.renderId}_events.json`;
  const manifestName = `render${opts.renderId}_manifest.json`;

  const srcHtml = opts.htmlPath || path.join(pkgDir, htmlName);
  const srcThree = opts.threePath || path.join(rootDir, "assets", "three.module.min.js");
  const srcWav = opts.wavPath || path.join(pkgDir, wavName);
  const srcEvents = opts.eventsPath || path.join(pkgDir, eventsName);

  for (const requiredFile of [srcHtml, srcThree, srcWav, srcEvents]) {
    if (!fs.existsSync(requiredFile)) {
      throw new Error(`Missing required package input: ${requiredFile}`);
    }
  }

  const htmlContent = fs.readFileSync(srcHtml, "utf-8");
  const externalUrls = (htmlContent.match(/https?:\/\/[^\s"'<>]+/g) || []).filter(
    (u) => u !== "http://www.w3.org/2000/svg"
  );
  if (externalUrls.length > 0) {
    throw new Error(`External URLs disallowed in offline Local Studio bundle: ${externalUrls.join(", ")}`);
  }
  if (!htmlContent.includes('"./assets/three.module.min.js"')) {
    throw new Error(`${htmlName} importmap must reference "./assets/three.module.min.js".`);
  }

  fs.mkdirSync(assetsDir, { recursive: true });
  const dstHtml = path.join(pkgDir, htmlName);
  const dstThree = path.join(assetsDir, "three.module.min.js");
  const dstWav = path.join(pkgDir, wavName);
  const dstEvents = path.join(pkgDir, eventsName);
  const dstManifest = path.join(pkgDir, manifestName);
  const dstZip = path.join(rootDir, "output", `${opts.episodeId}_render${opts.renderId}_local_studio.zip`);

  if (path.resolve(srcHtml) !== dstHtml) fs.copyFileSync(srcHtml, dstHtml);
  if (path.resolve(srcThree) !== dstThree) fs.copyFileSync(srcThree, dstThree);
  if (path.resolve(srcWav) !== dstWav) fs.copyFileSync(srcWav, dstWav);
  if (path.resolve(srcEvents) !== dstEvents) fs.copyFileSync(srcEvents, dstEvents);

  const wavStream = inspectWav(dstWav);
  const expectedSamples = Math.round(opts.durationSec * 48000);
  if (wavStream.sampleRate !== 48000 || wavStream.channels !== 2) {
    throw new Error(`WAV must be 48kHz stereo, got ${wavStream.sampleRate}Hz / ${wavStream.channels}ch`);
  }
  if (Math.abs(wavStream.sampleCountPerChannel - expectedSamples) > 24) {
    throw new Error(`WAV sample count ${wavStream.sampleCountPerChannel} mismatches expected ${expectedSamples}`);
  }

  const eventsObj = JSON.parse(fs.readFileSync(dstEvents, "utf-8"));
  const trackedFiles = [
    { rel: htmlName, abs: dstHtml, mimeType: "text/html" },
    { rel: "assets/three.module.min.js", abs: dstThree, mimeType: "application/javascript" },
    { rel: wavName, abs: dstWav, mimeType: "audio/wav" },
    { rel: eventsName, abs: dstEvents, mimeType: "application/json" },
  ].map((item) => ({
    path: item.rel,
    sizeBytes: fs.statSync(item.abs).size,
    sha256: sha256File(item.abs),
    mimeType: item.mimeType,
  }));

  const htmlAsset = trackedFiles.find((f) => f.path === htmlName);
  const wavAsset = trackedFiles.find((f) => f.path === wavName);
  const eventsAsset = trackedFiles.find((f) => f.path === eventsName);

  const manifest = {
    schemaVersion: 1,
    episodeId: opts.episodeId,
    renderId: opts.renderId,
    title: opts.title,
    deliveryFormat: "windows_local_studio_bundle",
    masterTimelineSec: {
      start: opts.masterStartSec,
      end: Number((opts.masterStartSec + opts.durationSec).toFixed(4)),
    },
    localTimelineSec: { start: 0, end: opts.durationSec },
    durationSec: opts.durationSec,
    isFinalSegment: opts.isFinalSegment,
    resolution: { width: 1080, height: 1920, aspectRatio: "9:16" },
    fps: 30,
    frameCount: Math.round(opts.durationSec * 30),
    entryHtml: htmlName,
    eventsFile: eventsName,
    deterministicContract: {
      durationGlobal: "window.DURATION",
      renderFunction: "window.renderAt(t)",
      requiresExternalNetwork: false,
      requiresAiStudioPaths: false,
    },
    hashes: {
      visualHash: htmlAsset.sha256,
      visualShortHash: htmlAsset.sha256.slice(0, 12),
      timingHash: eventsAsset.sha256,
      timingShortHash: eventsAsset.sha256.slice(0, 12),
      audioHash: wavAsset.sha256,
      audioShortHash: wavAsset.sha256.slice(0, 12),
      previewHtmlHash: htmlAsset.sha256,
      cueTimingHash: eventsAsset.sha256,
    },
    creativeApproval: {
      status: "unapproved",
      approvedVisualShortHash: null,
      approvedAt: null,
    },
    deliveryTracking: {
      runtimePackagedOnDisk: true,
      checksumVerified: true,
      userObtainedConfirmed: false,
    },
    audio: {
      file: wavName,
      eventsFile: eventsName,
      startOffsetSec: 0,
      codec: wavStream.codecName,
      sampleRate: wavStream.sampleRate,
      channels: wavStream.channels,
      bitsPerSample: wavStream.bitsPerSample,
      sampleCountPerChannel: wavStream.sampleCountPerChannel,
      durationSec: wavStream.durationSec,
      sfxOnly: true,
      narrationIncluded: false,
      musicIncluded: false,
      cueCount: Number(eventsObj.cue_count || 0),
      sha256: wavAsset.sha256,
    },
    assets: trackedFiles,
    workflow: {
      localPlaybackAndVideoExport: "Windows Local Studio (HTML + WAV)",
      hydrogenMp4ExportRequired: false,
      finalEpisodeAssembly: "CapCut (narration, captions, music, BGM, mixing)",
    },
    packagedAt: new Date().toISOString(),
  };

  const tmpManifest = `${dstManifest}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpManifest, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  fs.renameSync(tmpManifest, dstManifest);

  const zipEntries = [
    { archivePath: htmlName, absPath: dstHtml },
    { archivePath: "assets/three.module.min.js", absPath: dstThree },
    { archivePath: wavName, absPath: dstWav },
    { archivePath: eventsName, absPath: dstEvents },
    { archivePath: manifestName, absPath: dstManifest },
  ];
  writeStoreZipAtomic(zipEntries, dstZip);

  console.log(
    JSON.stringify(
      {
        episodeId: opts.episodeId,
        renderId: opts.renderId,
        packageDir: pkgDir,
        zipPath: dstZip,
        zipSha256: sha256File(dstZip),
        visualShortHash: manifest.hashes.visualShortHash,
        audioShortHash: manifest.hashes.audioShortHash,
        files: zipEntries.map((e) => e.archivePath),
      },
      null,
      2
    )
  );
}

main();
