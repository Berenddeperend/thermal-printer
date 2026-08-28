import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from './config.ts';
import { PrintQueue } from './queue.ts';

const execFileAsync = promisify(execFile);

const WIDTH = 400;
const HEIGHT = 300;
const FPS = 15;
const BITRATE = 500_000;

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export type Capturer = {
  /**
   * Starts a camera recording, waits out the pre-roll, then runs `printJob`.
   * The recording (and its mux to mp4) continues in the background and is
   * never awaited here — the returned promise resolves as soon as `printJob`
   * does, so callers get the video URL well before the file exists.
   */
  captureAndPrint: <T>(printJob: () => Promise<T>) => Promise<{ video: string; result: T }>;
};

export function buildVideoUrl(id: string): string {
  return `/api/printer/video/${id}.mp4`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rawPath(id: string): string {
  return path.join(config.videoDir, `${id}.h264`);
}

function mp4Path(id: string): string {
  return path.join(config.videoDir, `${id}.mp4`);
}

async function runCapture(id: string): Promise<void> {
  const totalMs = config.videoPreRollMs + config.videoActiveMs;

  await execFileAsync('rpicam-vid', [
    '--nopreview',
    '--width', String(WIDTH),
    '--height', String(HEIGHT),
    '--framerate', String(FPS),
    '--bitrate', String(BITRATE),
    '--intra', String(FPS),
    '--timeout', String(totalMs),
    '-o', rawPath(id),
  ]);

  await execFileAsync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'h264', '-r', String(FPS),
    '-i', rawPath(id),
    '-c', 'copy', '-movflags', '+faststart',
    mp4Path(id),
  ]);

  await fs.rm(rawPath(id), { force: true });
}

async function runCaptureSafely(id: string): Promise<void> {
  try {
    await runCapture(id);
  } catch (err) {
    console.error('[video] capture failed for %s:', id, err);
    await Promise.all([
      fs.rm(rawPath(id), { force: true }),
      fs.rm(mp4Path(id), { force: true }),
    ]);
  }
}

function createRealCapturer(): Capturer {
  // Independent from the print queue — the camera is a separate device from
  // the printer's USB port, so it only needs to serialize against itself.
  const captureQueue = new PrintQueue();

  return {
    captureAndPrint: async (printJob) => {
      const id = randomUUID();

      // Fire-and-forget: never await this, even indirectly. If it were
      // awaited, a second concurrent request's capture job would sit behind
      // the first one in captureQueue, and the response would stall for
      // however long that first capture+mux takes.
      captureQueue.enqueue(() => runCaptureSafely(id)).catch(() => {});

      await sleep(config.videoPreRollMs);
      const result = await printJob();
      return { video: buildVideoUrl(id), result };
    },
  };
}

function createMockCapturer(): Capturer {
  return {
    captureAndPrint: async (printJob) => {
      const id = randomUUID();
      console.log('[mock-video] capture start', id);
      await sleep(config.videoPreRollMs);
      const result = await printJob();
      console.log('[mock-video] print done (no file written in dev)', id);
      return { video: buildVideoUrl(id), result };
    },
  };
}

export function createCapturer(): Capturer {
  if (config.env === 'production') {
    return createRealCapturer();
  }
  console.log('Using mock video capturer (NODE_ENV=%s)', config.env);
  return createMockCapturer();
}

async function sweep(): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(config.videoDir);
  } catch {
    return;
  }

  const now = Date.now();
  await Promise.all(
    entries.map(async (name) => {
      const filePath = path.join(config.videoDir, name);
      try {
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > config.videoTtlMs) {
          await fs.rm(filePath, { force: true });
        }
      } catch {
        // Already removed by a concurrent sweep — ignore.
      }
    }),
  );
}

export function startVideoCleanupSweep(): void {
  void sweep(); // clear anything stale left over from a prior crash/restart
  setInterval(sweep, SWEEP_INTERVAL_MS);
}
