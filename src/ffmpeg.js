import {spawn} from 'node:child_process';

export const runProcess = (command, args, {captureStdout = true, allowFailure = false} = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', captureStdout ? 'pipe' : 'inherit', 'pipe']});
    const stdout = [];
    const stderr = [];
    child.stdout?.on('data', (chunk) => stdout.push(chunk));
    child.stderr?.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => reject(new Error(`${command} could not start: ${error.message}`)));
    child.on('close', (code) => {
      const result = {code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
      if (code !== 0 && !allowFailure) {
        reject(new Error(`${command} exited with code ${code}: ${result.stderr.toString('utf8').trim()}`));
        return;
      }
      resolve(result);
    });
  });

export const getToolVersion = async (command) => {
  const output = await runProcess(command, ['-version']);
  return output.stdout.toString('utf8').split(/\r?\n/, 1)[0] ?? '';
};

const parseRate = (rate) => {
  if (!rate || rate === '0/0') return undefined;
  const [numerator, denominator] = rate.split('/').map(Number);
  if (!numerator || !denominator) return undefined;
  return numerator / denominator;
};

const finite = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const probeInput = async (input, sequenceFps) => {
  const inputArgs = input.includes('%') ? ['-framerate', String(sequenceFps)] : [];
  const output = await runProcess('ffprobe', [
    '-v', 'error',
    ...inputArgs,
    '-show_entries', [
      'stream=index,codec_type,width,height,avg_frame_rate,r_frame_rate,nb_frames,codec_name,pix_fmt,profile,bit_rate,color_space,color_transfer,color_primaries,channels,sample_rate',
      'format=duration,format_name,size,bit_rate'
    ].join(':'),
    '-of', 'json',
    input
  ]);
  const parsed = JSON.parse(output.stdout.toString('utf8'));
  const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
  const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
  if (!video?.width || !video?.height) throw new Error('No readable video stream found');
  const fps = parseRate(video.avg_frame_rate) ?? parseRate(video.r_frame_rate) ?? sequenceFps;
  return {
    width: Number(video.width),
    height: Number(video.height),
    fps,
    durationSeconds: finite(parsed.format?.duration),
    frameCount: finite(video.nb_frames),
    codec: String(video.codec_name ?? 'unknown').toLowerCase(),
    pixelFormat: video.pix_fmt ? String(video.pix_fmt).toLowerCase() : undefined,
    profile: video.profile ? String(video.profile) : undefined,
    videoBitRate: finite(video.bit_rate) ?? finite(parsed.format?.bit_rate),
    container: parsed.format?.format_name ? String(parsed.format.format_name).toLowerCase() : undefined,
    fileSizeBytes: finite(parsed.format?.size),
    colorSpace: video.color_space ? String(video.color_space) : undefined,
    colorTransfer: video.color_transfer ? String(video.color_transfer) : undefined,
    colorPrimaries: video.color_primaries ? String(video.color_primaries) : undefined,
    audioCodec: audio?.codec_name ? String(audio.codec_name).toLowerCase() : undefined,
    audioChannels: finite(audio?.channels),
    audioSampleRate: finite(audio?.sample_rate)
  };
};

export const streamGrayscaleFrames = async ({input, inputFps, width, height, maxFrames, timeoutMs = 1200000, signal, onFrame}) => {
  const inputArgs = input.includes('%') ? ['-framerate', String(inputFps)] : [];
  const videoFilter = `scale=${width}:${height}:flags=area,format=gray`;
  const args = [
    '-v', 'error',
    ...inputArgs,
    '-i', input,
    '-an',
    '-sn',
    '-dn',
    '-vf', videoFilter,
    ...(maxFrames ? ['-frames:v', String(Math.floor(maxFrames))] : []),
    '-f', 'rawvideo',
    '-pix_fmt', 'gray',
    'pipe:1'
  ];

  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, {stdio: ['ignore', 'pipe', 'pipe']});
    const stderr = [];
    const frameBytes = width * height;
    let pending = Buffer.alloc(0);
    let index = 0;
    let sequence = Promise.resolve();
    let settled = false;
    let terminationReason;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const terminate = (reason) => {
      if (settled || terminationReason) return;
      terminationReason = reason;
      child.kill('SIGKILL');
    };
    const onAbort = () => terminate('Frame analysis was cancelled');
    const timer = setTimeout(() => terminate(`Frame analysis exceeded ${timeoutMs}ms`), timeoutMs);
    timer.unref?.();
    if (signal?.aborted) terminate('Frame analysis was cancelled');
    else signal?.addEventListener('abort', onAbort, {once: true});

    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => finish(() => reject(new Error(`ffmpeg could not start: ${error.message}`))));
    child.stdout.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= frameBytes) {
        const frame = pending.subarray(0, frameBytes);
        pending = pending.subarray(frameBytes);
        const currentIndex = index;
        index += 1;
        sequence = sequence.then(() => onFrame(Buffer.from(frame), currentIndex));
      }
    });
    child.on('close', (code) => {
      sequence.then(() => finish(() => {
        if (terminationReason) {
          reject(new Error(terminationReason));
          return;
        }
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString('utf8').trim()}`));
          return;
        }
        if (pending.length !== 0) {
          reject(new Error(`ffmpeg returned an incomplete raw frame (${pending.length} bytes)`));
          return;
        }
        resolve(index);
      })).catch((error) => finish(() => reject(error)));
    });
  });
};
