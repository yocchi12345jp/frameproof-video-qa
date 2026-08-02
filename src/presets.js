const mb = 1_000_000;
const gb = 1_000 * mb;

export const presets = Object.freeze({
  'x-video': Object.freeze({
    description: 'X standard non-Premium web-upload technical profile.',
    config: Object.freeze({
      minimumAspectRatio: 1 / 2.39,
      maximumAspectRatio: 2.39,
      minimumWidth: 32,
      minimumHeight: 32,
      landscapeMaximumWidth: 1920,
      landscapeMaximumHeight: 1200,
      portraitMaximumWidth: 1200,
      portraitMaximumHeight: 1900,
      maximumFps: 40,
      maximumVideoBitRate: 25_000_000,
      maximumDurationSeconds: 140,
      maximumFileSizeBytes: 512 * mb,
      platformRuleSeverity: 'error'
    })
  }),
  'x-ad': Object.freeze({
    description: 'X Video Ads technical compatibility profile based on X Ads creative specifications.',
    config: Object.freeze({
      acceptedAspects: ['1:1', '1.91:1', '16:9', '9:16', '4:5', '2:3'],
      allowedContainers: ['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'],
      allowedVideoCodecs: ['h264'],
      allowedPixelFormats: ['yuv420p'],
      allowedAudioCodecs: ['aac'],
      maximumFps: 60,
      maximumDurationSeconds: 140,
      maximumFileSizeBytes: gb,
      recommendedMaximumFileSizeBytes: 30 * mb,
      platformRuleSeverity: 'error'
    })
  })
});

export const listPresets = () => Object.entries(presets).map(([name, value]) => ({
  name,
  description: value.description
}));

export const getPreset = (name) => {
  if (!name) return undefined;
  const preset = presets[name];
  if (!preset) throw new Error(`Unknown preset: ${name}. Available presets: ${Object.keys(presets).join(', ')}`);
  return preset;
};
