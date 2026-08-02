# FrameProof Studio usability and visual audit

Audit date: 2026-08-02  
Version: 0.3.0

## Scope

The audit covered the primary dashboard, scan setup, command palette, saved-result view, and responsive mobile layout. The production localhost server and scan API were tested independently, while the visual browser pass loaded the same shipped HTML, CSS, JavaScript, and API fixtures in a controlled Chromium harness because the execution environment blocks browser navigation to localhost by policy.

## Viewports

- Desktop: 1440 × 1000
- Mobile: 390 × 844
- Light appearance with Japanese UI
- System appearance, English localization, and dark-theme state were also exercised through controls

## Interaction paths verified

1. Dashboard → New scan
2. Recommended → Strict mode switch
3. Rule enable/disable and advanced disclosure
4. Command palette with Ctrl/Cmd + K and Escape
5. Saved report → result details
6. Finding list → timeline marker selection
7. Settings → theme and language selection
8. Mobile bottom navigation

## Visual checks

- No horizontal overflow at either audited viewport.
- Sidebar and mobile navigation preserve a stable selected state.
- Primary action remains visually dominant without competing actions.
- Labels remain visible; placeholders are not used as the only field description.
- Error, warning, and success states use icon, label, and color together.
- Focus styling, reduced motion, system appearance, and keyboard shortcuts are present.
- Advanced thresholds remain collapsed until requested.
- The scan summary stays visible on desktop and moves before configuration on narrow screens.
- Result findings remain adjacent to the video/timeline on desktop and stack on narrow screens.

## Defect found and fixed

CSS layout declarations for selected-file and progress components overrode the HTML `hidden` attribute. This caused empty file metadata and a scanning panel to appear before a scan began. A global `[hidden] { display: none !important; }` rule was added, and the desktop and mobile screens were re-audited.

The saved report originally retained the page title “New scan.” Result-state title logic was added so it now reads “Scan result” / “スキャン結果.”

## Browser observations

- Browser console errors: 0
- Page script errors: 0
- Desktop document width: 1440px at a 1440px viewport
- Mobile document width: 390px at a 390px viewport
- Automated Node tests: 16 passed

## Evidence

- `docs/images/studio-dashboard.png`
- `docs/images/studio-dashboard-ja.png`
- `docs/images/studio-scan.png`
- `docs/images/studio-result.png`
- `docs/images/studio-mobile.png`

## Known limits

- The audit is not a substitute for external user sessions with unfamiliar users.
- Native operating-system file-picker appearance is controlled by the browser and was not visually captured in headless Chromium.
- FrameProof’s edge-activity rule remains a heuristic and does not semantically identify text without future render-manifest or caption adapters.
