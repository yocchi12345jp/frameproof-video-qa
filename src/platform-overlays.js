const checkedDate = '2026-08-02';

const overlays = [
  {
    id: 'tiktok-in-feed',
    label: 'TikTok In-Feed',
    presetAliases: ['tiktok'],
    checkedDate,
    sourceUrl: 'https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads',
    status: 'preview-approximation',
    assumptions: 'Typical portrait mobile UI. Exact occlusion varies by device, caption length, locale, and interactive add-ons.',
    zones: [
      {id: 'top-chrome', label: 'Top UI', x: 0, y: 0, width: 1, height: 0.08},
      {id: 'right-actions', label: 'Action rail', x: 0.84, y: 0.26, width: 0.16, height: 0.56},
      {id: 'caption-actions', label: 'Caption and controls', x: 0, y: 0.78, width: 0.88, height: 0.22}
    ]
  },
  {
    id: 'instagram-reels',
    label: 'Instagram Reels',
    presetAliases: ['instagram-reels', 'reels'],
    checkedDate,
    sourceUrl: 'https://www.facebook.com/business/help/980593475366490',
    status: 'preview-approximation',
    assumptions: 'Typical portrait mobile UI. Exact controls and caption expansion vary by app version and device.',
    zones: [
      {id: 'top-chrome', label: 'Top UI', x: 0, y: 0, width: 1, height: 0.09},
      {id: 'right-actions', label: 'Action rail', x: 0.84, y: 0.34, width: 0.16, height: 0.48},
      {id: 'caption-actions', label: 'Caption and controls', x: 0, y: 0.78, width: 0.9, height: 0.22}
    ]
  },
  {
    id: 'youtube-shorts',
    label: 'YouTube Shorts',
    presetAliases: ['youtube-shorts'],
    checkedDate,
    sourceUrl: 'https://support.google.com/youtube/answer/10059070',
    status: 'preview-approximation',
    assumptions: 'Typical portrait mobile UI. Exact action rail and caption footprint vary by device and account state.',
    zones: [
      {id: 'top-chrome', label: 'Top UI', x: 0, y: 0, width: 1, height: 0.075},
      {id: 'right-actions', label: 'Action rail', x: 0.84, y: 0.3, width: 0.16, height: 0.53},
      {id: 'caption-actions', label: 'Caption and controls', x: 0, y: 0.8, width: 0.9, height: 0.2}
    ]
  },
  {
    id: 'x-video',
    label: 'X Video',
    presetAliases: ['x-video', 'x-ad'],
    checkedDate,
    sourceUrl: 'https://help.x.com/en/using-x/x-videos',
    status: 'preview-approximation',
    assumptions: 'Typical mobile timeline playback. Player controls and post text vary by client and expanded state.',
    zones: [
      {id: 'player-controls', label: 'Player controls', x: 0, y: 0.86, width: 1, height: 0.14}
    ]
  }
];

export const listPlatformOverlays = () => overlays.map((overlay) => structuredClone(overlay));

export const getPlatformOverlay = (name) => {
  if (!name) return undefined;
  const normalized = String(name).toLowerCase();
  const found = overlays.find((overlay) => overlay.id === normalized || overlay.presetAliases.includes(normalized));
  return found ? structuredClone(found) : undefined;
};

export const boxesOverlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
