# FrameProof Studio UX research and design rationale

This document records the interaction and visual-system decisions behind FrameProof Studio v0.3.0.

## Product problem

The CLI is efficient for automation, but its configuration surface exposes technical concepts such as frozen-frame thresholds, outer-margin ratios, platform profiles, and failure severity. A first-time user should not need to understand every parameter before scanning a video.

The Studio design therefore follows four requirements:

1. a useful scan must be possible with one file selection and one primary action;
2. recommended values must be visible and reversible;
3. advanced controls must remain available without dominating the initial view;
4. every long-running or failed operation must provide clear, contextual feedback.

## Research sources

### Apple Human Interface Guidelines

- Design principles: purpose, familiarity, consistent feedback, transparency, and recovery from mistakes.
  - https://developer.apple.com/design/human-interface-guidelines/design-principles
- Settings: settings should remain stable, clearly identify the active area, and remember the last useful state.
  - https://developer.apple.com/design/human-interface-guidelines/settings
- Disclosure controls: keep likely choices visible and hide advanced detail until relevant.
  - https://developer.apple.com/design/human-interface-guidelines/disclosure-controls
- Onboarding: the product should be understandable through use; guidance should be short and skippable.
  - https://developer.apple.com/design/human-interface-guidelines/onboarding
- Drag and drop: support familiar drop behavior, provide a non-drag alternative, and continuously communicate transfer state.
  - https://developer.apple.com/design/human-interface-guidelines/drag-and-drop
- Progress indicators and feedback: reassure users that lengthy work is active and reserve disruptive alerts for actionable critical information.
  - https://developer.apple.com/design/human-interface-guidelines/progress-indicators
  - https://developer.apple.com/design/human-interface-guidelines/feedback
  - https://developer.apple.com/design/human-interface-guidelines/alerts
- Accessibility and color: do not use color as the only signal, preserve contrast in light and dark appearance, support keyboard access, and follow system appearance when possible.
  - https://developer.apple.com/design/human-interface-guidelines/accessibility
  - https://developer.apple.com/design/human-interface-guidelines/color
  - https://developer.apple.com/design/human-interface-guidelines/dark-mode

### GitHub Primer

- Navigation: keep orientation clear, streamline the number of destinations, and avoid disorienting transitions.
  - https://primer.style/product/ui-patterns/navigation/
- Forms: minimize cognitive load, use short labels, and never rely on placeholder text as the only label.
  - https://primer.style/product/ui-patterns/forms/
- Progressive disclosure: preserve context, use icon and text together, and reveal detail only when needed.
  - https://primer.style/product/ui-patterns/progressive-disclosure/
- Toggle switch: use for immediate Boolean changes.
  - https://primer.style/product/components/toggle-switch/
- Segmented control: use a small mutually exclusive set and apply the selected appearance immediately.
  - https://primer.style/product/components/segmented-control/guidelines/
- Saving: do not mix implicit and explicit saving within a single form, and preserve user input when an operation fails.
  - https://primer.style/product/ui-patterns/saving/
- Loading: keep system status visible so users do not interpret a long process as a silent failure.
  - https://primer.style/product/ui-patterns/loading/
- Action list: use consistent single-column actions with visible hover, active, and focus states.
  - https://primer.style/product/components/action-list/guidelines/

## Resulting information architecture

The sidebar contains five stable destinations:

- Dashboard
- New scan
- Reports
- Rules
- Settings

The primary flow is not split into a blocking onboarding sequence. It is a single scan page with three visible sections:

1. add a video;
2. choose the use and mode;
3. confirm enabled rules.

Advanced thresholds are contained in one disclosure region. The effective configuration remains visible in a sticky summary and can be copied as a CLI command.

## Defaults and progressive disclosure

Three task-level modes reduce parameter work:

| Mode | Intended use | Behavior |
|---|---|---|
| Recommended | normal publishing checks | balanced thresholds, full scan |
| Fast | early iteration | limited frames and fewer warning-heavy checks |
| Strict | final release gate | lower freeze threshold and warnings treated as failure |

Users can still change every rule independently. Changing a detailed threshold moves the state into a custom configuration without erasing the selected file.

## File interaction

FrameProof supports both:

- drag and drop / file chooser;
- explicit local path entry.

This preserves accessibility and supports very large files without requiring a browser-style upload interaction. The browser transfer is only to the localhost process and is accompanied by progress feedback.

## Result interaction

A result has three levels of detail:

1. summary metrics for errors, warnings, analyzed frames, and preset;
2. a video player and issue timeline;
3. a filterable finding list with raw details.

Selecting a finding seeks the local video to its first affected frame. Color is paired with symbols, text labels, and severity names.

## Visual language

FrameProof intentionally combines two familiar product languages rather than imitating one product:

- Apple influence: system typography, restrained surfaces, clear hierarchy, limited controls, system appearance, and low-friction settings;
- GitHub influence: dark developer sidebar, Primer-like borders and status colors, compact tables, action lists, command palette, and explicit CI terminology.

The implementation uses no remote fonts, analytics, image CDNs, or third-party UI runtime. Light, dark, high-contrast system settings, keyboard focus, reduced motion, and responsive layouts are supported.

## Usability acceptance criteria

- A first scan can be started without opening advanced settings.
- Every control has a persistent visible label.
- Drag-and-drop has a file picker and path-entry alternative.
- Scanning always shows an active progress state.
- Errors preserve the selected file and configuration.
- The user can inspect and copy the equivalent CLI command.
- A finding can seek the preview to the relevant timestamp.
- The entire primary flow is keyboard accessible.
- The interface does not depend on color alone.
- System theme is the default and the selected setting persists locally.
