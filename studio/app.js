const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  bootstrap: undefined,
  recent: [],
  currentView: 'dashboard',
  selectedMedia: undefined,
  currentReport: undefined,
  currentArtifacts: undefined,
  currentMediaUrl: undefined,
  currentRepair: undefined,
  mode: 'recommended',
  findingFilter: 'all',
  selectedFinding: undefined,
  settings: {
    theme: localStorage.getItem('frameproof.theme') || 'system',
    language: localStorage.getItem('frameproof.language') || 'auto',
    remember: localStorage.getItem('frameproof.remember') !== 'false',
    openResult: localStorage.getItem('frameproof.openResult') !== 'false'
  }
};

const messages = {
  ja: {
    'skip.main': 'メインコンテンツへ移動', 'nav.dashboard': 'ダッシュボード', 'nav.scan': '新しいスキャン', 'nav.reports': 'レポート', 'nav.rules': 'ルール', 'nav.settings': '設定', 'nav.command': 'コマンド',
    'action.refresh': '更新', 'action.newScan': '新しいスキャン', 'action.viewAll': 'すべて表示', 'action.startScan': 'スキャンを開始', 'action.usePath': 'パスを使用', 'action.runScan': 'スキャンを実行', 'action.showCommand': 'CLIコマンドを確認', 'action.resetRecommended': '推奨値に戻す', 'action.close': '閉じる', 'action.copy': 'コピー',
    'metric.total': 'スキャン数', 'metric.totalHelp': '保存済みレポート', 'metric.errors': 'エラー', 'metric.errorsHelp': '公開前に修正が必要', 'metric.warnings': '警告', 'metric.warningsHelp': '確認を推奨', 'metric.passed': '合格', 'metric.passedHelp': 'エラーなし',
    'dashboard.recent': '最近のスキャン', 'dashboard.recentHelp': '結果を選ぶと詳細レポートを開きます。', 'dashboard.quick': 'すぐに始める', 'dashboard.quickHelp': '推奨設定なら3つの操作だけです。',
    'table.file': 'ファイル', 'table.result': '結果', 'table.preset': 'プリセット', 'table.date': '日時',
    'empty.noReports': 'まだレポートがありません', 'empty.noReportsHelp': '最初の動画を追加すると、結果がここに保存されます。',
    'quick.add': '動画を追加', 'quick.addHelp': 'ドラッグ、選択、またはパス入力', 'quick.profile': '投稿先を選択', 'quick.profileHelp': '不明な場合は推奨のまま', 'quick.scan': 'スキャンを実行', 'quick.scanHelp': '問題箇所へ直接ジャンプ',
    'scan.source': '動画を追加', 'scan.sourceHelp': 'ファイルはローカル環境から外部へ送信されません。', 'scan.profile': '用途を選択', 'scan.profileHelp': '迷った場合は「推奨」を選ぶだけで構いません。', 'scan.rules': '確認するルール', 'scan.rulesHelp': 'よく使うルールだけを表示しています。',
    'drop.title': '動画をここにドロップ', 'drop.help': 'またはクリックしてファイルを選択', 'drop.private': 'localhost上でのみ処理します', 'common.or': 'または', 'path.label': 'ローカルファイルのパス',
    'mode.recommended': '推奨', 'mode.recommendedHelp': '品質と速度のバランス', 'mode.fast': '高速', 'mode.fastHelp': '短時間の事前確認', 'mode.strict': '厳格', 'mode.strictHelp': '警告も失敗として扱う',
    'field.platform': '投稿先', 'field.platformHelp': '技術仕様を自動適用します。', 'field.aspect': '期待する比率', 'field.aspectHelp': '自動では選択動画の比率を使用します。',
    'rule.blank': '空白フレーム', 'rule.blankHelp': '真っ黒・真っ白・ほぼ空のフレーム', 'rule.frozen': '映像の停止', 'rule.frozenHelp': '意図しない長時間の静止', 'rule.edge': 'セーフエリア', 'rule.edgeHelp': '画面端の字幕・UI・罫線リスク', 'rule.aspect': '比率と解像度', 'rule.aspectHelp': '縦横比と投稿先の解像度', 'rule.platform': '投稿先の技術仕様', 'rule.platformHelp': 'コーデック、FPS、尺、容量',
    'rule.captions': '字幕データ', 'rule.captionsHelp': 'SRT・VTT・Caption JSONの読速、改行、重なり', 'rule.audio': '音声の完全性', 'rule.audioHelp': '無音区間、ラウドネス、音声トラック欠落',
    'advanced.revision': '改訂比較（任意）', 'advanced.revisionHelp': '前回レポートと比較し、新規・悪化・解消を分類します。', 'advanced.baseline': '基準レポート', 'advanced.baselineHelp': '保存済みレポート名、またはJSONのパス', 'advanced.acceptances': '許容済み指摘', 'advanced.acceptancesHelp': 'レビュー済み指摘を次回以降も引き継ぎます。', 'advanced.sourceAware': 'ソース対応（任意）', 'advanced.sourceAwareHelp': '指定すると問題をComposition・Sequence・ソースファイルへ戻します。', 'advanced.manifest': 'Render Manifest', 'advanced.manifestHelp': '.frameproof/manifest.json など', 'advanced.captions': '字幕ファイル', 'advanced.captionsHelp': '.srt / .vtt / .json', 'advanced.captionLanguage': '字幕言語', 'advanced.captionLanguageHelp': '自動判定、日本語、英語', 'advanced.platformPreview': 'Platform Preview', 'advanced.platformPreviewHelp': 'プレビュー上へ投稿先UIの目安を表示',
    'summary.sourceMode': 'スキャン方式', 'summary.revisionMode': '改訂比較', 'preset.xVideo': 'X 通常動画', 'preset.xAd': 'X 動画広告', 'preset.custom': 'カスタム / 指定なし', 'aspect.auto': '動画から自動', 'aspect.landscape': '16:9 横長', 'aspect.vertical': '9:16 縦長', 'aspect.square': '1:1 正方形', 'aspect.portrait': '4:5 縦長', 'option.auto': '自動', 'option.japanese': '日本語', 'overlay.auto': 'プリセットに合わせる', 'overlay.none': '表示しない', 'theme.system': 'システム', 'theme.light': 'ライト', 'theme.dark': 'ダーク',
    'advanced.title': '詳細設定', 'advanced.help': '必要な場合のみ変更', 'advanced.freeze': '停止と判断する時間', 'advanced.margin': 'セーフマージン', 'advanced.edge': '端の密度しきい値', 'advanced.frameLimit': '解析フレーム上限', 'advanced.frameLimitHelp': '空欄なら動画全体',
    'summary.title': 'スキャン内容', 'summary.mode': '設定モード', 'summary.rules': '有効ルール', 'privacy.local': 'ローカル処理', 'privacy.localHelp': '動画は外部サーバーへアップロードしません。',
    'progress.scanning': '動画を解析しています',
    'reports.title': 'レポート', 'reports.help': '保存された監査結果を確認できます。', 'rules.title': 'ルール', 'rules.help': '各検査の目的と推奨値を確認できます。',
    'settings.title': '設定', 'settings.help': '表示と操作方法を変更します。', 'settings.appearance': '外観', 'settings.theme': 'テーマ', 'settings.themeHelp': 'OSの設定に合わせることを推奨します。', 'settings.language': '言語', 'settings.languageHelp': '画面の表示言語です。', 'settings.behavior': '動作', 'settings.remember': '最後の設定を記憶', 'settings.rememberHelp': '次回のスキャンに同じ設定を使用します。', 'settings.openReport': '完了後に結果を開く', 'settings.openReportHelp': '問題箇所をすぐに確認します。', 'settings.privacy': 'プライバシー', 'settings.privacyBody': 'FrameProof Studioは127.0.0.1で動作し、動画を外部サービスへ送信しません。レポートはローカルの.frameproof/reportsに保存されます。', 'settings.shortcuts': 'ショートカット',
    'shortcut.new': '新しいスキャン', 'shortcut.command': 'コマンドパレット', 'shortcut.run': 'スキャン実行', 'shortcut.close': '閉じる',
    'environment.title': '実行環境', 'environment.help': 'スキャンに必要なツールの状態です。', 'cli.title': 'CLIコマンド', 'cli.help': '現在の設定をターミナルでも再現できます。'
  },
  en: {
    'skip.main': 'Skip to main content', 'nav.dashboard': 'Dashboard', 'nav.scan': 'New scan', 'nav.reports': 'Reports', 'nav.rules': 'Rules', 'nav.settings': 'Settings', 'nav.command': 'Commands',
    'action.refresh': 'Refresh', 'action.newScan': 'New scan', 'action.viewAll': 'View all', 'action.startScan': 'Start scan', 'action.usePath': 'Use path', 'action.runScan': 'Run scan', 'action.showCommand': 'Show CLI command', 'action.resetRecommended': 'Restore recommended', 'action.close': 'Close', 'action.copy': 'Copy',
    'metric.total': 'Scans', 'metric.totalHelp': 'Saved reports', 'metric.errors': 'Errors', 'metric.errorsHelp': 'Fix before publish', 'metric.warnings': 'Warnings', 'metric.warningsHelp': 'Review recommended', 'metric.passed': 'Passed', 'metric.passedHelp': 'No errors',
    'dashboard.recent': 'Recent scans', 'dashboard.recentHelp': 'Select a result to open its report.', 'dashboard.quick': 'Quick start', 'dashboard.quickHelp': 'Recommended mode takes three actions.',
    'table.file': 'File', 'table.result': 'Result', 'table.preset': 'Preset', 'table.date': 'Date',
    'empty.noReports': 'No reports yet', 'empty.noReportsHelp': 'Add your first video and its results will appear here.',
    'quick.add': 'Add a video', 'quick.addHelp': 'Drop, choose, or enter a path', 'quick.profile': 'Choose a destination', 'quick.profileHelp': 'Keep recommended when unsure', 'quick.scan': 'Run the scan', 'quick.scanHelp': 'Jump directly to each issue',
    'scan.source': 'Add a video', 'scan.sourceHelp': 'The file stays on your local machine.', 'scan.profile': 'Choose its use', 'scan.profileHelp': 'Recommended mode is the right default for most scans.', 'scan.rules': 'Rules to check', 'scan.rulesHelp': 'Only frequently used rules are shown here.',
    'drop.title': 'Drop a video here', 'drop.help': 'or click to choose a file', 'drop.private': 'Processed only on localhost', 'common.or': 'or', 'path.label': 'Local file path',
    'mode.recommended': 'Recommended', 'mode.recommendedHelp': 'Balanced quality and speed', 'mode.fast': 'Fast', 'mode.fastHelp': 'Quick preflight review', 'mode.strict': 'Strict', 'mode.strictHelp': 'Treat warnings as failures',
    'field.platform': 'Destination', 'field.platformHelp': 'Applies technical limits automatically.', 'field.aspect': 'Expected aspect', 'field.aspectHelp': 'Auto uses the selected video ratio.',
    'rule.blank': 'Blank frames', 'rule.blankHelp': 'Black, white, or near-empty frames', 'rule.frozen': 'Frozen video', 'rule.frozenHelp': 'Unexpected long visual holds', 'rule.edge': 'Safe area', 'rule.edgeHelp': 'Captions and UI close to the edge', 'rule.aspect': 'Aspect and resolution', 'rule.aspectHelp': 'Project ratio and destination resolution', 'rule.platform': 'Destination requirements', 'rule.platformHelp': 'Codec, FPS, duration, and size',
    'rule.captions': 'Caption data', 'rule.captionsHelp': 'Reading speed, line breaks, and overlap in SRT, VTT, and Caption JSON', 'rule.audio': 'Audio integrity', 'rule.audioHelp': 'Silence intervals, loudness, and missing audio tracks',
    'advanced.revision': 'Revision comparison (optional)', 'advanced.revisionHelp': 'Compare with a previous report and classify new, regressed, and resolved findings.', 'advanced.baseline': 'Baseline report', 'advanced.baselineHelp': 'Saved report name or JSON path', 'advanced.acceptances': 'Accepted findings', 'advanced.acceptancesHelp': 'Carry reviewed findings into future revisions.', 'advanced.sourceAware': 'Source-aware inputs (optional)', 'advanced.sourceAwareHelp': 'Map issues back to compositions, sequences, and source files.', 'advanced.manifest': 'Render Manifest', 'advanced.manifestHelp': 'For example, .frameproof/manifest.json', 'advanced.captions': 'Caption file', 'advanced.captionsHelp': '.srt / .vtt / .json', 'advanced.captionLanguage': 'Caption language', 'advanced.captionLanguageHelp': 'Automatic, Japanese, or English', 'advanced.platformPreview': 'Platform preview', 'advanced.platformPreviewHelp': 'Overlay approximate destination UI zones on the preview',
    'summary.sourceMode': 'Scan mode', 'summary.revisionMode': 'Revision gate', 'preset.xVideo': 'X standard video', 'preset.xAd': 'X video ad', 'preset.custom': 'Custom / none', 'aspect.auto': 'Automatic from video', 'aspect.landscape': '16:9 landscape', 'aspect.vertical': '9:16 vertical', 'aspect.square': '1:1 square', 'aspect.portrait': '4:5 portrait', 'option.auto': 'Automatic', 'option.japanese': 'Japanese', 'overlay.auto': 'Match the preset', 'overlay.none': 'Do not show', 'theme.system': 'System', 'theme.light': 'Light', 'theme.dark': 'Dark',
    'advanced.title': 'Advanced settings', 'advanced.help': 'Change only when needed', 'advanced.freeze': 'Frozen duration threshold', 'advanced.margin': 'Safe margin', 'advanced.edge': 'Edge activity threshold', 'advanced.frameLimit': 'Frame analysis limit', 'advanced.frameLimitHelp': 'Leave blank for the full video',
    'summary.title': 'Scan summary', 'summary.mode': 'Mode', 'summary.rules': 'Enabled rules', 'privacy.local': 'Local processing', 'privacy.localHelp': 'Videos are never uploaded to an external server.',
    'progress.scanning': 'Analyzing video',
    'reports.title': 'Reports', 'reports.help': 'Review saved audit results.', 'rules.title': 'Rules', 'rules.help': 'Understand each check and its recommended value.',
    'settings.title': 'Settings', 'settings.help': 'Change appearance and interaction preferences.', 'settings.appearance': 'Appearance', 'settings.theme': 'Theme', 'settings.themeHelp': 'Following the operating system is recommended.', 'settings.language': 'Language', 'settings.languageHelp': 'Language used in the interface.', 'settings.behavior': 'Behavior', 'settings.remember': 'Remember last settings', 'settings.rememberHelp': 'Reuse them for the next scan.', 'settings.openReport': 'Open results when finished', 'settings.openReportHelp': 'Review issues immediately.', 'settings.privacy': 'Privacy', 'settings.privacyBody': 'FrameProof Studio runs on 127.0.0.1 and never sends video to an external service. Reports are saved locally in .frameproof/reports.', 'settings.shortcuts': 'Keyboard shortcuts',
    'shortcut.new': 'New scan', 'shortcut.command': 'Command palette', 'shortcut.run': 'Run scan', 'shortcut.close': 'Close',
    'environment.title': 'Environment', 'environment.help': 'Status of tools required for scanning.', 'cli.title': 'CLI command', 'cli.help': 'Reproduce the current settings in a terminal.'
  }
};

const findingText = {
  ja: {
    ASPECT_RATIO_MISMATCH: ['比率が一致しません', '期待する縦横比と動画の寸法が異なります。'],
    BLANK_FRAME: ['空白フレームを検出', '真っ黒、真っ白、またはほぼ情報のないフレームがあります。'],
    FROZEN_RUN: ['映像が長時間停止', '視覚的な変化が少ない状態が設定時間を超えています。'],
    EDGE_ACTIVITY: ['画面端に要素が集中', '字幕、罫線、UIがクロップ領域に近い可能性があります。'],
    PLATFORM_ASPECT_UNSUPPORTED: ['投稿先が比率をサポートしていません', '選択した投稿先の対応比率から外れています。'],
    PLATFORM_ASPECT_OUT_OF_RANGE: ['投稿先の比率範囲外', '選択した投稿先が許可する範囲から外れています。'],
    PLATFORM_RESOLUTION_TOO_SMALL: ['解像度が小さすぎます', '投稿先の最小解像度を満たしていません。'],
    PLATFORM_RESOLUTION_TOO_LARGE: ['解像度が大きすぎます', '投稿先の最大解像度を超えています。'],
    PLATFORM_CONTAINER_UNSUPPORTED: ['コンテナ形式が非対応', '投稿先が許可する動画コンテナではありません。'],
    PLATFORM_VIDEO_CODEC_UNSUPPORTED: ['映像コーデックが非対応', '投稿先が許可する映像コーデックではありません。'],
    PLATFORM_PIXEL_FORMAT_UNSUPPORTED: ['色形式が非対応', '投稿先が許可するピクセル形式ではありません。'],
    PLATFORM_AUDIO_CODEC_UNSUPPORTED: ['音声コーデックが非対応', '投稿先が許可する音声コーデックではありません。'],
    PLATFORM_BIT_RATE_TOO_HIGH: ['ビットレートが高すぎます', '投稿先の上限を超えています。'],
    PLATFORM_FRAME_RATE_TOO_HIGH: ['フレームレートが高すぎます', '投稿先のFPS上限を超えています。'],
    PLATFORM_DURATION_TOO_LONG: ['動画が長すぎます', '投稿先の最大時間を超えています。'],
    PLATFORM_FILE_TOO_LARGE: ['ファイルが大きすぎます', '投稿先の容量上限を超えています。'],
    PLATFORM_FILE_ABOVE_RECOMMENDATION: ['推奨容量を超えています', 'アップロードは可能でも軽量化を推奨します。'],
    MANIFEST_FPS_MISMATCH: ['ManifestとFPSが一致しません', 'ソース側のFPSと完成動画のFPSが異なります。'],
    MANIFEST_DIMENSIONS_MISMATCH: ['Manifestと寸法が一致しません', 'ソース側の画面寸法と完成動画が異なります。'],
    MANIFEST_DURATION_MISMATCH: ['Manifestと尺が一致しません', 'ソース側の予定尺と完成動画の尺が異なります。'],
    EXPECTED_MOTION_MISSING: ['動くべき区間が停止しています', '宣言された区間の視覚変化が期待値を下回っています。'],
    TEXT_TOO_SMALL: ['文字が小さすぎます', '宣言された文字サイズが最低値を下回っています。'],
    TEXT_TOO_MANY_LINES: ['文字の行数が多すぎます', '宣言された最大行数を超えています。'],
    EXPECTED_VISIBLE_MISSING: ['表示されるべき要素が見えません', '宣言された区間で表示要素を確認できません。'],
    EXPECTED_AUDIO_MISSING: ['音声が欠落しています', '音声があるべき区間に長い無音があります。'],
    SAFE_AREA_VIOLATION: ['投稿先UIと重なる可能性があります', '宣言された要素がセーフエリアを外れています。'],
    CAPTION_TOO_SHORT: ['字幕の表示が短すぎます', '読む前に字幕が切り替わる可能性があります。'],
    CAPTION_TOO_LONG: ['字幕の表示が長すぎます', '字幕が長時間残り続けています。'],
    CAPTION_TOO_FAST: ['字幕の読速が速すぎます', '表示時間に対して文字数が多すぎます。'],
    CAPTION_TOO_MANY_LINES: ['字幕の行数が多すぎます', '推奨行数を超えています。'],
    CAPTION_LINE_TOO_LONG: ['字幕の1行が長すぎます', '読みやすい位置で改行する必要があります。'],
    CAPTION_OVERLAP: ['字幕時間が重複しています', '複数の字幕が同時に表示される時間があります。'],
    CAPTION_GAP_TOO_SHORT: ['字幕間隔が短すぎます', '字幕の切り替わりが詰まりすぎています。'],
    CAPTION_OUTSIDE_DURATION: ['字幕が動画尺を超えています', '字幕時間が完成動画の外側にあります。'],
    CAPTION_REGION_COLLISION: ['字幕とUIが重なります', '宣言されたCTAやUI領域と字幕が衝突します。'],
    NO_AUDIO_STREAM: ['音声トラックがありません', '完成動画に音声ストリームが含まれていません。'],
    UNEXPECTED_SILENCE: ['長い無音区間があります', '意図しない音声欠落の可能性があります。'],
    AUDIO_LOUDNESS_OUT_OF_RANGE: ['音量が推奨範囲外です', '統合ラウドネスを確認してください。'],
    AUDIO_TRUE_PEAK_TOO_HIGH: ['音声ピークが高すぎます', 'クリッピングや歪みの可能性があります。']
  },
  en: {}
};

const ruleCatalog = [
  {code: 'BLANK_FRAME', symbol: '■', tone: 'error', titleJa: '空白フレーム', titleEn: 'Blank frames', bodyJa: 'トランジション境界やレンダリング不具合で生じる黒・白・ほぼ空のフレームを検出します。', bodyEn: 'Detects black, white, or near-empty frames caused by transition and rendering defects.', thresholdJa: '標準偏差 3以下', thresholdEn: 'Std. deviation ≤ 3', result: 'error'},
  {code: 'FROZEN_RUN', symbol: '▰', tone: 'warning', titleJa: '映像の停止', titleEn: 'Frozen video', bodyJa: '連続フレームの変化量を比較し、意図しない静止区間の可能性を報告します。', bodyEn: 'Compares adjacent frames and reports potentially unintended visual holds.', thresholdJa: '推奨 2.5秒', thresholdEn: 'Recommended 2.5 sec', result: 'warning'},
  {code: 'EDGE_ACTIVITY', symbol: '▣', tone: 'success', titleJa: 'セーフエリア', titleEn: 'Safe area', bodyJa: '外周マージン内の視覚密度を測定し、字幕やUIのクロップリスクを示します。', bodyEn: 'Measures visual density in the outer margin to flag caption and UI crop risk.', thresholdJa: '外周 5% / 密度 8%', thresholdEn: 'Outer 5% / activity 8%', result: 'warning'},
  {code: 'ASPECT_RATIO_MISMATCH', symbol: '◇', tone: 'info', titleJa: '縦横比', titleEn: 'Aspect ratio', bodyJa: '16:9、9:16など、プロジェクトが期待する比率と実際の出力を比較します。', bodyEn: 'Compares the actual export with the project ratio such as 16:9 or 9:16.', thresholdJa: '許容差 0.002', thresholdEn: 'Tolerance 0.002', result: 'error'},
  {code: 'PLATFORM', symbol: '⌁', tone: 'info', titleJa: '投稿先の技術仕様', titleEn: 'Platform requirements', bodyJa: 'コーデック、ピクセル形式、FPS、尺、容量、解像度をプリセットと比較します。', bodyEn: 'Checks codec, pixel format, FPS, duration, size, and resolution against a preset.', thresholdJa: '選択プリセットに準拠', thresholdEn: 'Defined by preset', result: 'error / warning'},
  {code: 'CAPTIONS', symbol: 'CC', tone: 'info', titleJa: '字幕データ', titleEn: 'Caption data', bodyJa: 'SRT、VTT、JSONを使い、読速、改行、重複、画面UIとの衝突をネットワークなしで検査します。', bodyEn: 'Audits SRT, VTT, and JSON for reading speed, line breaks, timing overlap, and UI collisions.', thresholdJa: '日本語16文字/行・20文字/秒', thresholdEn: 'Language-aware defaults', result: 'error / warning'},
  {code: 'AUDIO', symbol: '♪', tone: 'warning', titleJa: '音声の完全性', titleEn: 'Audio integrity', bodyJa: '完成動画の音声トラック、長い無音、ラウドネス、True Peakを確認します。', bodyEn: 'Checks final-export audio streams, long silence, loudness, and true peak.', thresholdJa: '-24〜-12 LUFS / -1 dBTP以下', thresholdEn: '-24 to -12 LUFS / ≤ -1 dBTP', result: 'error / warning'},
  {code: 'SOURCE', symbol: '</>', tone: 'success', titleJa: 'ソース逆引き', titleEn: 'Source mapping', bodyJa: 'Render Manifestを使い、問題をComposition、Sequence、コンポーネント、ソース行へ戻します。', bodyEn: 'Maps findings back to compositions, sequences, components, and source lines through a Render Manifest.', thresholdJa: 'Manifest schema v1.0', thresholdEn: 'Manifest schema v1.0', result: 'context'}
];

const language = () => state.settings.language === 'auto'
  ? (navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en')
  : state.settings.language;

const t = (key) => messages[language()]?.[key] || messages.ja[key] || key;

const applyLanguage = () => {
  document.documentElement.lang = language();
  $$('[data-i18n]').forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value) element.textContent = value;
  });
  $('#command-input').placeholder = language() === 'ja' ? 'コマンドを検索' : 'Search commands';
  updatePageTitle();
  renderRuleCatalog();
  renderDashboard();
  renderReports();
  updateSummary();
};

const applyTheme = () => {
  document.documentElement.dataset.theme = state.settings.theme;
  $$('[data-theme-choice]').forEach((button) => button.classList.toggle('is-selected', button.dataset.themeChoice === state.settings.theme));
};

const viewTitles = {
  dashboard: {ja: 'ダッシュボード', en: 'Dashboard'},
  scan: {ja: '新しいスキャン', en: 'New scan'},
  reports: {ja: 'レポート', en: 'Reports'},
  rules: {ja: 'ルール', en: 'Rules'},
  settings: {ja: '設定', en: 'Settings'}
};

const updatePageTitle = () => {
  const showingResult = state.currentView === 'scan' && Boolean(state.currentReport) && $('#scan-setup')?.hidden;
  const title = showingResult
    ? (language() === 'ja' ? 'スキャン結果' : 'Scan result')
    : (viewTitles[state.currentView]?.[language()] || state.currentView);
  $('#page-title').textContent = title;
  document.title = `${title} · FrameProof Studio`;
};

const showView = (view) => {
  state.currentView = view;
  $$('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.viewPanel === view));
  $$('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
  updatePageTitle();
  window.scrollTo({top: 0, behavior: 'smooth'});
  if (view === 'reports') renderReports();
};

const toast = (message, tone = 'success') => {
  const item = document.createElement('div');
  item.className = `toast ${tone}`;
  item.innerHTML = `<span aria-hidden="true">${tone === 'error' ? '!' : '✓'}</span><span>${escapeHtml(message)}</span>`;
  $('#toast-region').append(item);
  setTimeout(() => item.remove(), 4200);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1000 && index < units.length - 1) { value /= 1000; index += 1; }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};
const formatDate = (value) => new Intl.DateTimeFormat(language() === 'ja' ? 'ja-JP' : 'en-US', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
const fileNameFromPath = (value) => String(value || '').split(/[\\/]/).pop() || value || '—';

const resultTone = (summary) => {
  if (summary.revisionPassed === false) return 'error';
  if (summary.revisionPassed === true) return summary.warningRegressions > 0 ? 'warning' : 'success';
  return summary.errors > 0 ? 'error' : summary.warnings > 0 ? 'warning' : 'success';
};
const resultLabel = (summary) => {
  if (summary.revisionPassed === false) return language() === 'ja' ? '改訂NG' : 'Revision failed';
  if (summary.revisionPassed === true) {
    if (summary.warningRegressions > 0) return language() === 'ja' ? '要確認' : 'Review';
    return language() === 'ja' ? '改訂OK' : 'Revision passed';
  }
  if (summary.errors > 0) return language() === 'ja' ? `エラー ${summary.errors}` : `${summary.errors} error${summary.errors === 1 ? '' : 's'}`;
  if (summary.warnings > 0) return language() === 'ja' ? `警告 ${summary.warnings}` : `${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`;
  return language() === 'ja' ? '合格' : 'Passed';
};

const refreshRecent = async () => {
  const response = await fetch('/api/recent');
  if (!response.ok) throw new Error((await response.json()).error || 'Could not load reports');
  state.recent = (await response.json()).reports;
  renderDashboard();
  renderReports();
  const options = $('#recent-report-options');
  if (options) options.innerHTML = state.recent.map((report) => `<option value="${escapeHtml(report.fileName)}">${escapeHtml(fileNameFromPath(report.input))}</option>`).join('');
};

const renderDashboard = () => {
  const totalErrors = state.recent.reduce((sum, report) => sum + report.summary.errors, 0);
  const totalWarnings = state.recent.reduce((sum, report) => sum + report.summary.warnings, 0);
  const totalPassed = state.recent.filter((report) => report.summary.errors === 0).length;
  $('#metric-total').textContent = state.recent.length;
  $('#metric-errors').textContent = totalErrors;
  $('#metric-warnings').textContent = totalWarnings;
  $('#metric-passed').textContent = totalPassed;
  const body = $('#recent-table-body');
  body.innerHTML = '';
  const items = state.recent.slice(0, 6);
  $('#recent-empty').classList.toggle('is-visible', items.length === 0);
  for (const report of items) {
    const row = document.createElement('tr');
    row.tabIndex = 0;
    row.innerHTML = `<td><div class="file-cell"><span class="file-badge">VID</span><span>${escapeHtml(fileNameFromPath(report.input))}</span></div></td><td><span class="status-pill ${resultTone(report.summary)}">${escapeHtml(resultLabel(report.summary))}</span></td><td>${escapeHtml(report.config?.preset || 'Custom')}</td><td>${escapeHtml(formatDate(report.generatedAt))}</td>`;
    row.addEventListener('click', () => openSavedReport(report.fileName));
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openSavedReport(report.fileName); });
    body.append(row);
  }
};

const renderReports = () => {
  const list = $('#reports-list');
  list.innerHTML = '';
  $('#reports-empty').classList.toggle('is-visible', state.recent.length === 0);
  for (const report of state.recent) {
    const row = document.createElement('article');
    row.className = 'report-row';
    row.innerHTML = `<div class="file-cell"><span class="file-badge">VID</span><div><strong>${escapeHtml(fileNameFromPath(report.input))}</strong><small>${escapeHtml(report.metadata.width)}×${escapeHtml(report.metadata.height)} · ${escapeHtml(formatDuration(report.metadata.durationSeconds))}</small></div></div><span class="status-pill ${resultTone(report.summary)}">${escapeHtml(resultLabel(report.summary))}</span><small>${escapeHtml(report.config?.preset || 'Custom')}</small><small>${escapeHtml(formatDate(report.generatedAt))}</small><div class="report-actions"><button class="button secondary" type="button">${language() === 'ja' ? '開く' : 'Open'}</button></div>`;
    $('button', row).addEventListener('click', () => openSavedReport(report.fileName));
    list.append(row);
  }
};

const renderRuleCatalog = () => {
  const container = $('#rule-catalog');
  container.innerHTML = '';
  for (const rule of ruleCatalog) {
    const card = document.createElement('article');
    card.className = 'surface rule-catalog-card';
    const title = language() === 'ja' ? rule.titleJa : rule.titleEn;
    const body = language() === 'ja' ? rule.bodyJa : rule.bodyEn;
    const threshold = language() === 'ja' ? rule.thresholdJa : rule.thresholdEn;
    card.innerHTML = `<header><span class="${rule.tone}-symbol">${rule.symbol}</span><div><h3>${escapeHtml(title)}</h3><small><code>${escapeHtml(rule.code)}</code></small></div></header><p>${escapeHtml(body)}</p><dl><dt>${language() === 'ja' ? '推奨値' : 'Recommended'}</dt><dd>${escapeHtml(threshold)}</dd><dt>${language() === 'ja' ? '既定の重大度' : 'Default severity'}</dt><dd>${escapeHtml(rule.result)}</dd></dl>`;
    container.append(card);
  }
};

const bootstrap = async () => {
  const response = await fetch('/api/bootstrap');
  if (!response.ok) throw new Error((await response.json()).error || 'Bootstrap failed');
  state.bootstrap = await response.json();
  const ready = state.bootstrap.environment.ready;
  $('#environment-dot').classList.toggle('ready', ready);
  $('#environment-dot').classList.toggle('error', !ready);
  $('#environment-title').textContent = ready ? (language() === 'ja' ? '環境は準備完了' : 'Environment ready') : (language() === 'ja' ? '環境に問題があります' : 'Environment needs attention');
  $('#environment-detail').textContent = ready ? `Node ${state.bootstrap.environment.node.replace('v','')}` : 'FFmpeg / FFprobe';
  $('#report-directory').textContent = state.bootstrap.reportDirectory;
  renderEnvironment();
};

const renderEnvironment = () => {
  if (!state.bootstrap) return;
  const environment = state.bootstrap.environment;
  const missingLabel = language() === 'ja' ? '見つかりません' : 'Not found';
  const values = [
    {name: 'Node.js', value: environment.node, available: Boolean(environment.node)},
    {name: 'FFmpeg', value: environment.ffmpeg || missingLabel, available: Boolean(environment.ffmpeg)},
    {name: 'FFprobe', value: environment.ffprobe || missingLabel, available: Boolean(environment.ffprobe)}
  ];
  const rows = values.map(({name, value, available}) => `<div class="environment-row${available ? '' : ' is-missing'}"><span aria-hidden="true">${available ? '✓' : '!'}</span><strong>${escapeHtml(name)}</strong><code>${escapeHtml(value)}</code></div>`).join('');
  const guidance = environment.ready ? '' : `<div class="environment-guidance"><strong>${language() === 'ja' ? 'FFmpegとFFprobeが必要です' : 'FFmpeg and FFprobe are required'}</strong><p>${language() === 'ja' ? 'PATHから実行できるようにインストールした後、Studioを再起動してください。ターミナルでは frameproof doctor で確認できます。' : 'Install them so they are available on PATH, then restart Studio. Run frameproof doctor to verify the environment.'}</p><code>frameproof doctor</code></div>`;
  $('#environment-content').innerHTML = rows + guidance;
};

const uploadFile = (file) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');
  xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
  $('#upload-progress').hidden = false;
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) $('#upload-progress-bar').style.width = `${Math.round((event.loaded / event.total) * 100)}%`;
  });
  xhr.addEventListener('load', () => {
    $('#upload-progress').hidden = true;
    $('#upload-progress-bar').style.width = '0';
    if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
    else reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
  });
  xhr.addEventListener('error', () => reject(new Error('Upload failed')));
  xhr.send(file);
});

const selectMedia = (media) => {
  state.selectedMedia = media;
  $('#selected-file').hidden = false;
  $('#selected-name').textContent = media.name;
  const meta = media.metadata;
  $('#selected-metadata').textContent = `${meta.width}×${meta.height} · ${Number(meta.fps.toFixed(2))} fps · ${formatDuration(meta.durationSeconds)} · ${formatBytes(meta.fileSizeBytes)}`;
  $('#run-scan').disabled = false;
  if ($('#aspect-select').value === 'auto') updateSummary();
  updateSummary();
};

const clearMedia = () => {
  state.selectedMedia = undefined;
  $('#selected-file').hidden = true;
  $('#file-input').value = '';
  $('#run-scan').disabled = true;
  updateSummary();
};

const effectiveAspect = () => {
  const selected = $('#aspect-select').value;
  if (selected !== 'auto') return selected;
  const metadata = state.selectedMedia?.metadata;
  if (!metadata) return undefined;
  const ratio = metadata.width / metadata.height;
  const candidates = [['16:9', 16/9], ['9:16', 9/16], ['1:1', 1], ['4:5', 4/5]];
  return candidates.toSorted((a, b) => Math.abs(ratio - a[1]) - Math.abs(ratio - b[1]))[0][0];
};

const modeValues = {
  recommended: {maxFrozenSeconds: 2.5, safeMarginRatio: .05, maxEdgeActivityRatio: .08, maxFrames: undefined, failOnWarning: false, checkEdgeActivity: true},
  fast: {maxFrozenSeconds: 3, safeMarginRatio: .05, maxEdgeActivityRatio: .1, maxFrames: 600, failOnWarning: false, checkEdgeActivity: false},
  strict: {maxFrozenSeconds: 1.5, safeMarginRatio: .08, maxEdgeActivityRatio: .05, maxFrames: undefined, failOnWarning: true, checkEdgeActivity: true}
};

const applyMode = (mode) => {
  state.mode = mode;
  const values = modeValues[mode];
  $('#freeze-slider').value = values.maxFrozenSeconds;
  $('#margin-slider').value = Math.round(values.safeMarginRatio * 100);
  $('#edge-slider').value = Math.round(values.maxEdgeActivityRatio * 100);
  $('#max-frames-input').value = values.maxFrames || '';
  $('#rule-edge').checked = values.checkEdgeActivity;
  $$('.mode-card').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  updateSliders();
  updateSummary();
};

const updateSliders = () => {
  $('#freeze-output').textContent = `${Number($('#freeze-slider').value).toFixed(1)}${language() === 'ja' ? '秒' : ' sec'}`;
  $('#margin-output').textContent = `${$('#margin-slider').value}%`;
  $('#edge-output').textContent = `${$('#edge-slider').value}%`;
};

const currentConfig = () => {
  const preset = $('#preset-select').value || undefined;
  const maxFrames = Number($('#max-frames-input').value);
  return {
    preset,
    expectedAspect: effectiveAspect(),
    maxFrozenSeconds: Number($('#freeze-slider').value),
    safeMarginRatio: Number($('#margin-slider').value) / 100,
    maxEdgeActivityRatio: Number($('#edge-slider').value) / 100,
    maxFrames: Number.isFinite(maxFrames) && maxFrames > 0 ? maxFrames : undefined,
    captionLanguage: $('#caption-language-select').value,
    checkBlankFrames: $('#rule-blank').checked,
    checkFrozenRuns: $('#rule-frozen').checked,
    checkEdgeActivity: $('#rule-edge').checked,
    checkAspect: $('#rule-aspect').checked,
    checkPlatformMetadata: $('#rule-platform').checked,
    checkCaptions: $('#rule-captions').checked,
    checkAudioIntegrity: $('#rule-audio').checked,
    checkUnexpectedSilence: $('#rule-audio').checked
  };
};

const enabledRuleCount = () => ['#rule-blank','#rule-frozen','#rule-edge','#rule-aspect','#rule-platform','#rule-captions','#rule-audio'].filter((selector) => $(selector).checked).length;

const updateSummary = () => {
  const selected = state.selectedMedia;
  $('#summary-file').textContent = selected?.name || (language() === 'ja' ? '未選択' : 'Not selected');
  $('#summary-preset').textContent = $('#preset-select').selectedOptions[0]?.textContent || 'Custom';
  $('#summary-aspect').textContent = effectiveAspect() || (language() === 'ja' ? '自動' : 'Auto');
  $('#summary-mode').textContent = state.mode === 'recommended' ? t('mode.recommended') : state.mode === 'fast' ? t('mode.fast') : t('mode.strict');
  $('#summary-rules').textContent = String(enabledRuleCount());
  $('#summary-source-mode').textContent = $('#manifest-path-input').value.trim() ? (language() === 'ja' ? 'ソース対応' : 'Source-aware') : (language() === 'ja' ? 'ファイルのみ' : 'File only');
  $('#summary-revision-mode').textContent = $('#baseline-report-input').value.trim() ? (language() === 'ja' ? '前版と比較' : 'Compare baseline') : (language() === 'ja' ? 'なし' : 'None');
  updateCliCommand();
  if (state.settings.remember) {
    localStorage.setItem('frameproof.scanSettings', JSON.stringify({mode: state.mode, preset: $('#preset-select').value, aspect: $('#aspect-select').value, manifestPath: $('#manifest-path-input').value.trim(), captionsPath: $('#captions-path-input').value.trim(), captionLanguage: $('#caption-language-select').value, overlay: $('#overlay-select').value, baselineReportPath: $('#baseline-report-input').value.trim(), acceptancesPath: $('#acceptances-path-input').value.trim(), config: currentConfig()}));
  }
};

const updateCliCommand = () => {
  const config = currentConfig();
  const input = state.selectedMedia?.name || 'video.mp4';
  const parts = ['npx frameproof-video-qa scan', JSON.stringify(input)];
  if (config.preset) parts.push('--preset', config.preset);
  if (config.expectedAspect) parts.push('--aspect', config.expectedAspect);
  parts.push('--max-frozen-seconds', String(config.maxFrozenSeconds));
  parts.push('--safe-margin', String(config.safeMarginRatio));
  parts.push('--max-edge-activity', String(config.maxEdgeActivityRatio));
  if (config.maxFrames) parts.push('--max-frames', String(config.maxFrames));
  const manifestPath = $('#manifest-path-input').value.trim();
  const captionsPath = $('#captions-path-input').value.trim();
  if (manifestPath) parts.push('--manifest', JSON.stringify(manifestPath));
  if (captionsPath) parts.push('--captions', JSON.stringify(captionsPath), '--caption-language', config.captionLanguage);
  if (config.checkAudioIntegrity) parts.push('--audio', '--check-silence');
  const baselineReportPath = $('#baseline-report-input').value.trim();
  const acceptancesPath = $('#acceptances-path-input').value.trim();
  if (baselineReportPath) parts.push('--baseline', JSON.stringify(baselineReportPath), '--acceptances', JSON.stringify(acceptancesPath || '.frameproof/acceptances.json'), '--revision-json', 'artifacts/frameproof-revision.json', '--revision-html', 'artifacts/frameproof-revision.html', '--markdown', 'artifacts/frameproof-pr.md', '--sarif', 'artifacts/frameproof.sarif', '--junit', 'artifacts/frameproof.xml');
  if (!config.checkCaptions) parts.push('--no-captions');
  if (modeValues[state.mode].failOnWarning) parts.push('--fail-on-warning');
  parts.push('--json', 'artifacts/frameproof.json', '--html', 'artifacts/frameproof.html', '--fix-packets', 'artifacts/fix-packets.json');
  $('#cli-command').textContent = parts.join(' \\\n  ');
};

const runScan = async () => {
  if (!state.selectedMedia || $('#run-scan').disabled) return;
  $('#scan-setup').hidden = true;
  $('#scan-result').hidden = true;
  $('#scan-progress-panel').hidden = false;
  $('#progress-message').textContent = language() === 'ja' ? 'フレームを読み込み、選択したルールを確認しています。' : 'Decoding frames and applying the selected rules.';
  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        mediaId: state.selectedMedia.id,
        config: currentConfig(),
        manifestPath: $('#manifest-path-input').value.trim() || undefined,
        captionsPath: $('#captions-path-input').value.trim() || undefined,
        baselineReportPath: $('#baseline-report-input').value.trim() || undefined,
        acceptancesPath: $('#acceptances-path-input').value.trim() || undefined,
        failOnWarning: modeValues[state.mode].failOnWarning
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Scan failed');
    state.currentReport = payload.report;
    state.currentArtifacts = payload.artifacts;
    state.currentMediaUrl = payload.mediaUrl;
    $('#scan-progress-panel').hidden = true;
    renderResult();
    $('#scan-result').hidden = false;
    if (state.settings.openResult) $('#scan-result').scrollIntoView({behavior: 'smooth', block: 'start'});
    await refreshRecent();
    toast(payload.report.summary.errors > 0 ? (language() === 'ja' ? 'スキャンが完了しました。修正が必要な項目があります。' : 'Scan complete. Some issues need attention.') : (language() === 'ja' ? 'スキャンが完了しました。' : 'Scan complete.'), payload.report.summary.errors > 0 ? 'error' : 'success');
  } catch (error) {
    $('#scan-progress-panel').hidden = true;
    $('#scan-setup').hidden = false;
    toast(error.message, 'error');
  }
};

const findingLabel = (finding) => {
  if (language() === 'ja' && findingText.ja[finding.code]) return findingText.ja[finding.code];
  const title = finding.code.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
  return [title, finding.message];
};

const findingTime = (finding, report) => {
  const first = finding.frames?.[0];
  return Number.isFinite(first) ? first / report.metadata.fps : 0;
};

const resolveOverlay = (report) => {
  const choice = $('#overlay-select')?.value || 'auto';
  if (choice === 'none') return undefined;
  const overlays = state.bootstrap?.overlays || [];
  if (choice !== 'auto') return overlays.find((overlay) => overlay.id === choice);
  const preset = report?.config?.preset;
  return overlays.find((overlay) => overlay.id === preset || overlay.presetAliases?.includes(preset));
};

const overlayMarkup = (report) => {
  const overlay = resolveOverlay(report);
  if (!overlay) return '';
  return `<div class="platform-overlay" id="platform-overlay" aria-label="${escapeHtml(overlay.label)} preview">${overlay.zones.map((zone) => `<div class="platform-zone" style="left:${zone.x * 100}%;top:${zone.y * 100}%;width:${zone.width * 100}%;height:${zone.height * 100}%"><span>${escapeHtml(zone.label)}</span></div>`).join('')}</div>`;
};

const fixPacketForFinding = (finding) => state.currentReport?.fixPackets?.find((packet) => packet.id === finding.fixPacketId);

const copyRepairPrompt = async (agent, finding) => {
  const packet = fixPacketForFinding(finding);
  if (!packet) return;
  const prompt = `Use ${agent} to repair this FrameProof finding. Apply the smallest source change, rerender the affected range, and run the verify command.

${JSON.stringify(packet, null, 2)}`;
  await navigator.clipboard.writeText(prompt);
  toast(language() === 'ja' ? `${agent}向け修正指示をコピーしました。` : `Copied repair prompt for ${agent}.`);
};



const repairText = () => language() === 'ja' ? {
  title: '修復プラン', help: 'Claude CodeまたはCodexで安全に修正するためのセッションを作成します。', project: 'プロジェクト', projectHelp: 'Gitリポジトリのルート', warning: '警告も対象にする', warningHelp: '初回はエラーだけを推奨します。', command: 'レンダーコマンド（任意）', preview: '部分プレビュー', full: '全体レンダー', output: '検証動画の出力先', create: '修復プランを作成', cancel: 'キャンセル', cardTitle: 'Agent修復ループ', cardHelp: '対象範囲、変更可能ファイル、再検証手順をまとめた安全なセッションを作ります。', open: '修復プランを作る', ready: '修復セッションを作成しました', copyCodex: 'Codexコマンドをコピー', copyClaude: 'Claude Codeコマンドをコピー', copied: 'コマンドをコピーしました。'
} : {
  title: 'Repair plan', help: 'Create a guarded repair session for Claude Code or Codex.', project: 'Project', projectHelp: 'Git repository root', warning: 'Include warnings', warningHelp: 'Errors only is recommended for the first pass.', command: 'Render commands (optional)', preview: 'Range preview', full: 'Full render', output: 'Verification output video', create: 'Create repair plan', cancel: 'Cancel', cardTitle: 'Agent repair loop', cardHelp: 'Create a guarded session with target ranges, allowed files, and verification steps.', open: 'Create repair plan', ready: 'Repair session created', copyCodex: 'Copy Codex command', copyClaude: 'Copy Claude Code command', copied: 'Command copied.'
};

const applyRepairDialogLanguage = () => {
  const text = repairText();
  $('#repair-dialog-title').textContent = text.title;
  $('#repair-dialog-help').textContent = text.help;
  $('#repair-project-label').textContent = text.project;
  $('#repair-project-help').textContent = text.projectHelp;
  $('#repair-warning-label').textContent = text.warning;
  $('#repair-warning-help').textContent = text.warningHelp;
  $('#repair-command-summary').textContent = text.command;
  $('#repair-preview-label').textContent = text.preview;
  $('#repair-full-label').textContent = text.full;
  $('#repair-output-label').textContent = text.output;
  $('#create-repair-plan').textContent = text.create;
  $('#repair-cancel').textContent = text.cancel;
};

const openRepairDialog = () => {
  if (!state.currentReport || !state.currentArtifacts?.jsonName) return;
  applyRepairDialogLanguage();
  $('#repair-project-input').value = state.currentReport.manifest?.projectRoot || '';
  $('#repair-warning-input').checked = false;
  $('#repair-plan-result').hidden = true;
  $('#repair-plan-result').innerHTML = '';
  $('#repair-dialog').showModal();
};

const createRepairPlan = async () => {
  const text = repairText();
  const button = $('#create-repair-plan');
  button.disabled = true;
  try {
    const response = await fetch('/api/repair-plan', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
      reportFileName: state.currentArtifacts?.jsonName,
      agent: $('#repair-agent-select').value,
      projectRoot: $('#repair-project-input').value.trim() || undefined,
      includeWarnings: $('#repair-warning-input').checked,
      renderCommand: $('#repair-preview-command').value.trim() || undefined,
      fullRenderCommand: $('#repair-full-command').value.trim() || undefined,
      outputVideo: $('#repair-output-video').value.trim() || undefined
    })});
    const payload = await response.json();
    if (!response.ok) {
      const result = $('#repair-plan-result');
      result.hidden = false;
      result.classList.add('error');
      result.innerHTML = `<h3>${escapeHtml(language() === 'ja' ? '修復範囲を特定できません' : 'Repair scope is unmapped')}</h3><p>${escapeHtml(payload.error || 'Could not create repair plan')}</p>`;
      throw new Error(payload.error || 'Could not create repair plan');
    }
    $('#repair-plan-result').classList.remove('error');
    state.currentRepair = payload;
    const command = payload.commands[$('#repair-agent-select').value] || payload.commands.codex;
    const result = $('#repair-plan-result');
    result.hidden = false;
    result.innerHTML = `<h3>${escapeHtml(text.ready)}</h3><p>${escapeHtml(payload.session.targets.length)} ${language() === 'ja' ? '件の対象' : 'target(s)'} · ${escapeHtml(payload.session.ranges.length)} ${language() === 'ja' ? '区間' : 'range(s)'}</p><pre>${escapeHtml(command)}</pre><div class="repair-plan-actions"><button class="button primary" id="copy-repair-command" type="button">${escapeHtml($('#repair-agent-select').value === 'claude' ? text.copyClaude : text.copyCodex)}</button><a class="button secondary" href="${escapeHtml(payload.artifacts.html)}" target="_blank" rel="noopener">HTML</a><a class="button secondary" href="${escapeHtml(payload.artifacts.prompt)}" target="_blank" rel="noopener">Prompt</a></div>`;
    $('#copy-repair-command').addEventListener('click', async () => { await navigator.clipboard.writeText(command); toast(text.copied); });
  } catch (error) { toast(error.message, 'error'); }
  finally { button.disabled = false; }
};

const revisionStatusLabel = (status) => {
  const labels = language() === 'ja'
    ? {new:'新規',regressed:'悪化',improved:'改善',resolved:'解消',accepted:'許容済み',unchanged:'継続'}
    : {new:'New',regressed:'Regressed',improved:'Improved',resolved:'Resolved',accepted:'Accepted',unchanged:'Unchanged'};
  return labels[status] || status || '';
};

const renderResult = () => {
  const report = state.currentReport;
  if (!report) return;
  updatePageTitle();
  state.findingFilter = 'all';
  state.selectedFinding = report.findings[0];
  const revision = report.revision;
  const failed = revision ? !revision.summary.passed : report.summary.errors > 0;
  const tone = failed ? 'error' : 'success';
  const failedTitle = revision
    ? (language() === 'ja' ? '新しい重大な悪化があります' : 'New blocking regressions found')
    : (language() === 'ja' ? '公開前に修正が必要です' : 'Fix issues before publishing');
  const successTitle = revision
    ? (language() === 'ja' ? '新しい重大な悪化はありません' : 'No new blocking regressions')
    : (language() === 'ja' ? 'エラーは見つかりませんでした' : 'No errors found');
  const root = $('#scan-result');
  const artifactActions = [
    state.currentArtifacts?.html ? `<a class="button secondary" href="${escapeHtml(state.currentArtifacts.html)}" target="_blank" rel="noopener">HTML</a>` : '',
    state.currentArtifacts?.revisionHtml ? `<a class="button secondary" href="${escapeHtml(state.currentArtifacts.revisionHtml)}" target="_blank" rel="noopener">Diff</a>` : '',
    state.currentArtifacts?.markdown ? `<a class="button secondary" href="${escapeHtml(state.currentArtifacts.markdown)}" download>Markdown</a>` : '',
    state.currentArtifacts?.json ? `<a class="button primary" href="${escapeHtml(state.currentArtifacts.json)}" download>JSON</a>` : ''
  ].join('');
  const metricMarkup = revision
    ? `<article class="surface result-metric"><span>${language() === 'ja' ? '新規' : 'New'}</span><strong style="color:var(--danger)">${revision.summary.new}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? '悪化' : 'Regressed'}</span><strong style="color:var(--danger)">${revision.summary.regressed}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? '解消' : 'Resolved'}</span><strong style="color:var(--success)">${revision.summary.resolved}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? '許容済み' : 'Accepted'}</span><strong>${revision.summary.accepted}</strong></article>`
    : `<article class="surface result-metric"><span>${language() === 'ja' ? '解析フレーム' : 'Analyzed frames'}</span><strong>${report.summary.frameCount}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? 'エラー' : 'Errors'}</span><strong style="color:var(--danger)">${report.summary.errors}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? '警告' : 'Warnings'}</span><strong style="color:var(--warning)">${report.summary.warnings}</strong></article><article class="surface result-metric"><span>${language() === 'ja' ? 'プリセット' : 'Preset'}</span><strong>${escapeHtml(report.config.preset || 'Custom')}</strong></article>`;
  const resolvedMarkup = revision?.resolvedFindings?.length
    ? `<details class="surface resolved-panel"><summary>${language() === 'ja' ? `解消した指摘 ${revision.resolvedFindings.length}件` : `${revision.resolvedFindings.length} resolved finding(s)`}</summary><div>${revision.resolvedFindings.map((finding) => `<p><code>${escapeHtml(finding.code)}</code> ${escapeHtml(finding.message)}</p>`).join('')}</div></details>`
    : '';
  root.innerHTML = `<div class="result-shell">
    <div class="result-header"><div class="result-heading"><span class="result-icon ${tone}">${tone === 'error' ? '!' : '✓'}</span><div><h2>${escapeHtml(failed ? failedTitle : successTitle)}</h2><p>${escapeHtml(fileNameFromPath(report.input))} · ${escapeHtml(report.metadata.width)}×${escapeHtml(report.metadata.height)} · ${escapeHtml(formatDuration(report.metadata.durationSeconds))}</p></div></div><div class="result-actions"><button class="button secondary" id="result-new-scan" type="button">${language() === 'ja' ? '別の動画' : 'Another video'}</button>${artifactActions}</div></div>
    <div class="result-metrics">${metricMarkup}</div>${resolvedMarkup}${report.fixPackets?.length && report.summary.errors > 0 ? `<section class="repair-loop-card"><div><h3>${escapeHtml(repairText().cardTitle)}</h3><p>${escapeHtml(repairText().cardHelp)}</p></div><button class="button primary" id="open-repair-plan" type="button">${escapeHtml(repairText().open)}</button></section>` : ''}
    <div class="result-main"><section class="surface preview-surface"><div class="video-frame"><div class="video-stack">${state.currentMediaUrl ? `<video id="result-video" controls preload="metadata" src="${escapeHtml(state.currentMediaUrl)}"></video>` : `<div class="video-placeholder">${language() === 'ja' ? 'この保存済みレポートには動画プレビューがありません。' : 'This saved report has no video preview in the current session.'}</div>`}${overlayMarkup(report)}</div></div><div class="preview-toolbar"><label><input id="overlay-toggle" type="checkbox" checked> ${language() === 'ja' ? '投稿先UIを重ねる' : 'Show platform UI'}</label><small>${escapeHtml(resolveOverlay(report)?.label || (language() === 'ja' ? 'オーバーレイなし' : 'No overlay'))}</small></div><div class="timeline-panel"><div class="timeline-top"><strong>${language() === 'ja' ? '問題タイムライン' : 'Issue timeline'}</strong><span id="timeline-time">0:00 / ${escapeHtml(formatDuration(report.metadata.durationSeconds))}</span></div><div class="timeline" id="result-timeline"></div></div></section><section class="surface findings-surface"><div class="findings-toolbar"><h3>${language() === 'ja' ? '検出結果' : 'Findings'} (${report.findings.length})</h3><div class="filter-tabs" role="tablist"><button class="is-selected" data-filter="all" type="button">${language() === 'ja' ? 'すべて' : 'All'}</button><button data-filter="error" type="button">${language() === 'ja' ? 'エラー' : 'Errors'}</button><button data-filter="warning" type="button">${language() === 'ja' ? '警告' : 'Warnings'}</button>${revision ? `<button data-filter="changed" type="button">${language() === 'ja' ? '変更あり' : 'Changed'}</button>` : ''}</div></div><div class="finding-list" id="result-findings"></div><div class="finding-detail" id="finding-detail"></div></section></div>
  </div>`;
  $('#result-new-scan').addEventListener('click', resetScan);
  $('#open-repair-plan')?.addEventListener('click', openRepairDialog);
  $$('.filter-tabs button', root).forEach((button) => button.addEventListener('click', () => {
    state.findingFilter = button.dataset.filter;
    $$('.filter-tabs button', root).forEach((item) => item.classList.toggle('is-selected', item === button));
    renderFindings();
  }));
  const overlayToggle = $('#overlay-toggle');
  if (overlayToggle) overlayToggle.addEventListener('change', () => $('#platform-overlay')?.classList.toggle('is-hidden', !overlayToggle.checked));
  const video = $('#result-video');
  if (video) video.addEventListener('timeupdate', () => { $('#timeline-time').textContent = `${formatDuration(video.currentTime)} / ${formatDuration(video.duration || report.metadata.durationSeconds)}`; });
  renderTimeline();
  renderFindings();
};

const renderTimeline = () => {
  const report = state.currentReport;
  const timeline = $('#result-timeline');
  if (!timeline || !report) return;
  timeline.innerHTML = '';
  const duration = report.metadata.durationSeconds || (report.summary.frameCount / report.metadata.fps);
  report.findings.forEach((finding, index) => {
    const time = findingTime(finding, report);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = `timeline-marker ${finding.severity}`;
    marker.style.left = `${Math.min(100, Math.max(0, (time / duration) * 100))}%`;
    marker.title = `${findingLabel(finding)[0]} · ${formatDuration(time)}`;
    marker.setAttribute('aria-label', marker.title);
    marker.addEventListener('click', () => selectFinding(index));
    timeline.append(marker);
  });
};

const renderFindings = () => {
  const report = state.currentReport;
  const list = $('#result-findings');
  if (!list || !report) return;
  const findings = report.findings.filter((finding) => state.findingFilter === 'all' || finding.severity === state.findingFilter || (state.findingFilter === 'changed' && ['new','regressed','improved'].includes(finding.revision?.status)));
  list.innerHTML = '';
  if (findings.length === 0) {
    list.innerHTML = `<div class="no-findings"><span>✓</span><strong>${language() === 'ja' ? '該当する問題はありません' : 'No matching findings'}</strong></div>`;
    $('#finding-detail').hidden = true;
    return;
  }
  $('#finding-detail').hidden = false;
  findings.forEach((finding) => {
    const originalIndex = report.findings.indexOf(finding);
    const [title, description] = findingLabel(finding);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `finding-item${state.selectedFinding === finding ? ' is-selected' : ''}${finding.revision?.status ? ` revision-${finding.revision.status}` : ''}`;
    button.innerHTML = `<span class="finding-dot ${finding.severity}">${finding.severity === 'error' ? '!' : '△'}</span><span class="finding-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span>${finding.revision?.status ? `<span class="revision-pill ${escapeHtml(finding.revision.status)}">${escapeHtml(revisionStatusLabel(finding.revision.status))}</span>` : ''}<span class="finding-time">${escapeHtml(formatDuration(findingTime(finding, report)))}</span>`;
    button.addEventListener('click', () => selectFinding(originalIndex));
    list.append(button);
  });
  if (!findings.includes(state.selectedFinding)) state.selectedFinding = findings[0];
  renderFindingDetail();
};

const selectFinding = (index) => {
  const report = state.currentReport;
  if (!report?.findings[index]) return;
  state.selectedFinding = report.findings[index];
  state.findingFilter = 'all';
  $$('.filter-tabs button').forEach((button) => button.classList.toggle('is-selected', button.dataset.filter === 'all'));
  renderFindings();
  const overlayToggle = $('#overlay-toggle');
  if (overlayToggle) overlayToggle.addEventListener('change', () => $('#platform-overlay')?.classList.toggle('is-hidden', !overlayToggle.checked));
  const video = $('#result-video');
  if (video) {
    video.currentTime = findingTime(state.selectedFinding, report);
    video.play().catch(() => {});
  }
};

const acceptCurrentFinding = async () => {
  const report = state.currentReport;
  const finding = state.selectedFinding;
  if (!report || !finding || !state.currentArtifacts?.jsonName) return;
  const findingIndex = report.findings.indexOf(finding);
  const response = await fetch('/api/acceptance', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    reportFileName: state.currentArtifacts.jsonName,
    findingIndex,
    acceptancesPath: report.context?.acceptancesPath || $('#acceptances-path-input').value.trim() || '.frameproof/acceptances.json'
  })});
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Could not accept finding');
  const previousStatus = finding.revision?.status;
  finding.revision = {...finding.revision, status:'accepted', acceptedBy:{reason:payload.acceptance.reason}};
  if (report.revision) {
    report.revision.summary.accepted += 1;
    if (previousStatus && Number.isFinite(report.revision.summary[previousStatus])) report.revision.summary[previousStatus] = Math.max(0, report.revision.summary[previousStatus] - 1);
    if (['new','regressed'].includes(previousStatus) && finding.severity === 'error') report.revision.summary.blocking = Math.max(0, report.revision.summary.blocking - 1);
    report.revision.summary.passed = report.revision.summary.blocking === 0;
  }
  renderResult();
  toast(language() === 'ja' ? '許容済みとして保存しました。次回の比較にも引き継がれます。' : 'Saved as accepted and carried into future comparisons.');
};

const renderFindingDetail = () => {
  const finding = state.selectedFinding;
  const detail = $('#finding-detail');
  if (!detail || !finding) return;
  const [title] = findingLabel(finding);
  const entries = Object.entries(finding.details || {});
  const source = finding.source?.file ? `${finding.source.file}${finding.source.line ? `:${finding.source.line}` : ''}${finding.source.column ? `:${finding.source.column}` : ''}` : undefined;
  const packet = fixPacketForFinding(finding);
  const revision = finding.revision;
  const revisionPanel = revision ? `<section class="revision-detail"><strong>${language() === 'ja' ? '改訂判定' : 'Revision status'}</strong><span class="revision-pill ${escapeHtml(revision.status)}">${escapeHtml(revisionStatusLabel(revision.status))}</span>${revision.metricDelta !== undefined ? `<small>${language() === 'ja' ? '変化量' : 'Metric delta'}: ${escapeHtml(revision.metricDelta)}</small>` : ''}</section>` : '';
  const acceptButton = revision && revision.status !== 'accepted' ? `<button class="button secondary" id="accept-finding" type="button">${language() === 'ja' ? 'この指摘を許容済みにする' : 'Accept this finding'}</button>` : '';
  detail.innerHTML = `<h4>${escapeHtml(title)}</h4><p>${escapeHtml(finding.message)}</p>${revisionPanel}${source ? `<section class="source-panel"><span>&lt;/&gt;</span><div><strong>${language() === 'ja' ? 'ソース位置' : 'Source location'}</strong><code>${escapeHtml(source)}</code>${finding.contexts?.length ? `<small>${escapeHtml(finding.contexts.map((context) => context.id).join(' · '))}</small>` : ''}</div></section>` : ''}${entries.length ? `<dl>${entries.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value)}</dd>`).join('')}</dl>` : ''}${packet || acceptButton ? `<div class="repair-actions">${acceptButton}${packet ? `<button class="button secondary" id="copy-fix-packet" type="button">${language() === 'ja' ? 'Fix Packetをコピー' : 'Copy Fix Packet'}</button><button class="button secondary" id="repair-claude" type="button">Claude Code</button><button class="button primary" id="repair-codex" type="button">Codex</button>` : ''}</div>` : ''}`;
  $('#accept-finding')?.addEventListener('click', () => acceptCurrentFinding().catch((error) => toast(error.message, 'error')));
  $('#copy-fix-packet')?.addEventListener('click', async () => { await navigator.clipboard.writeText(JSON.stringify(packet, null, 2)); toast(language() === 'ja' ? 'Fix Packetをコピーしました。' : 'Fix Packet copied.'); });
  $('#repair-claude')?.addEventListener('click', () => copyRepairPrompt('Claude Code', finding));
  $('#repair-codex')?.addEventListener('click', () => copyRepairPrompt('Codex', finding));
};

const openSavedReport = async (fileName) => {
  try {
    const response = await fetch(`/api/report/${encodeURIComponent(fileName)}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Could not open report');
    state.currentReport = await response.json();
    state.currentArtifacts = {json: `/api/report-file/${encodeURIComponent(fileName)}`, html: `/api/report-file/${encodeURIComponent(fileName.replace(/\.json$/, '.html'))}`, jsonName: fileName};
    if (state.currentReport.revision) { const stem = fileName.replace(/\.json$/, ''); Object.assign(state.currentArtifacts, {revisionHtml:`/api/report-file/${encodeURIComponent(`${stem}.revision.html`)}`, markdown:`/api/report-file/${encodeURIComponent(`${stem}.md`)}`}); }
    state.currentMediaUrl = undefined;
    showView('scan');
    $('#scan-setup').hidden = true;
    $('#scan-progress-panel').hidden = true;
    renderResult();
    $('#scan-result').hidden = false;
  } catch (error) {
    toast(error.message, 'error');
  }
};

const resetScan = () => {
  state.currentReport = undefined;
  state.currentArtifacts = undefined;
  state.currentMediaUrl = undefined;
  state.currentRepair = undefined;
  clearMedia();
  $('#scan-setup').hidden = false;
  $('#scan-progress-panel').hidden = true;
  $('#scan-result').hidden = true;
  showView('scan');
};

const commands = () => [
  {id: 'new', icon: '＋', title: language() === 'ja' ? '新しいスキャン' : 'New scan', detail: language() === 'ja' ? '動画を追加して品質を確認' : 'Add a video and run quality checks', shortcut: '⌘N', run: resetScan},
  {id: 'dashboard', icon: '⌂', title: language() === 'ja' ? 'ダッシュボードを開く' : 'Open dashboard', detail: language() === 'ja' ? '最近の結果と概要' : 'Recent results and summary', run: () => showView('dashboard')},
  {id: 'reports', icon: '▤', title: language() === 'ja' ? 'レポートを開く' : 'Open reports', detail: language() === 'ja' ? '保存済みの監査結果' : 'Saved audit results', run: () => showView('reports')},
  {id: 'rules', icon: '✓', title: language() === 'ja' ? 'ルールを確認' : 'Review rules', detail: language() === 'ja' ? '検査内容と推奨値' : 'Checks and recommended values', run: () => showView('rules')},
  {id: 'settings', icon: '⚙', title: language() === 'ja' ? '設定を開く' : 'Open settings', detail: language() === 'ja' ? '外観、言語、動作' : 'Appearance, language, behavior', run: () => showView('settings')},
  {id: 'run', icon: '▶', title: language() === 'ja' ? '現在の動画をスキャン' : 'Scan current video', detail: language() === 'ja' ? '選択中の設定で開始' : 'Run with current settings', shortcut: '⌘↵', run: runScan}
];

const renderCommandPalette = (query = '') => {
  const normalized = query.trim().toLowerCase();
  const items = commands().filter((command) => `${command.title} ${command.detail}`.toLowerCase().includes(normalized));
  const root = $('#command-results');
  root.innerHTML = '';
  items.forEach((command, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `command-result${index === 0 ? ' is-selected' : ''}`;
    button.innerHTML = `<span>${command.icon}</span><div><strong>${escapeHtml(command.title)}</strong><small>${escapeHtml(command.detail)}</small></div>${command.shortcut ? `<kbd>${escapeHtml(command.shortcut)}</kbd>` : ''}`;
    button.addEventListener('click', () => { $('#command-dialog').close(); command.run(); });
    root.append(button);
  });
};

const openCommandPalette = () => {
  renderCommandPalette();
  $('#command-dialog').showModal();
  requestAnimationFrame(() => $('#command-input').focus());
};

const bindEvents = () => {
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-go-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.goView)));
  $('#new-scan-button').addEventListener('click', resetScan);
  $('#refresh-button').addEventListener('click', async () => { try { await refreshRecent(); toast(language() === 'ja' ? '更新しました。' : 'Refreshed.'); } catch (error) { toast(error.message, 'error'); } });
  $('#environment-button').addEventListener('click', () => $('#environment-dialog').showModal());
  $('#open-command').addEventListener('click', openCommandPalette);
  $('#command-input').addEventListener('input', (event) => renderCommandPalette(event.target.value));

  const dropZone = $('#drop-zone');
  dropZone.addEventListener('click', () => $('#file-input').click());
  dropZone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') $('#file-input').click(); });
  ['dragenter','dragover'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); }));
  ['dragleave','drop'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
  dropZone.addEventListener('drop', async (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    try { selectMedia(await uploadFile(file)); } catch (error) { toast(error.message, 'error'); }
  });
  $('#file-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { selectMedia(await uploadFile(file)); } catch (error) { toast(error.message, 'error'); }
  });
  $('#path-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = $('#path-input').value.trim();
    if (!value) return;
    try {
      const response = await fetch('/api/register-path', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:value})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not open path');
      selectMedia(payload);
    } catch (error) { toast(error.message, 'error'); }
  });
  $('#clear-file').addEventListener('click', clearMedia);

  $$('.mode-card').forEach((button) => button.addEventListener('click', () => applyMode(button.dataset.mode)));
  ['#preset-select','#aspect-select','#rule-blank','#rule-frozen','#rule-edge','#rule-aspect','#rule-platform','#rule-captions','#rule-audio','#max-frames-input','#manifest-path-input','#captions-path-input','#caption-language-select','#overlay-select','#baseline-report-input','#acceptances-path-input'].forEach((selector) => $(selector).addEventListener('change', updateSummary));
  ['#manifest-path-input','#captions-path-input','#baseline-report-input','#acceptances-path-input'].forEach((selector) => $(selector).addEventListener('input', updateSummary));
  ['#freeze-slider','#margin-slider','#edge-slider'].forEach((selector) => $(selector).addEventListener('input', () => { state.mode = 'custom'; updateSliders(); updateSummary(); $$('.mode-card').forEach((button) => { button.classList.remove('is-selected'); button.setAttribute('aria-checked','false'); }); }));
  $('#reset-settings').addEventListener('click', () => applyMode('recommended'));
  $('#run-scan').addEventListener('click', runScan);
  $('#show-command').addEventListener('click', () => $('#cli-dialog').showModal());
  $('#copy-command').addEventListener('click', async () => { await navigator.clipboard.writeText($('#cli-command').textContent); toast(language() === 'ja' ? 'コマンドをコピーしました。' : 'Command copied.'); });
  $('#create-repair-plan').addEventListener('click', createRepairPlan);

  $$('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
    state.settings.theme = button.dataset.themeChoice;
    localStorage.setItem('frameproof.theme', state.settings.theme);
    applyTheme();
  }));
  $('#language-select').value = state.settings.language;
  $('#language-select').addEventListener('change', (event) => {
    state.settings.language = event.target.value;
    localStorage.setItem('frameproof.language', state.settings.language);
    applyLanguage();
    applyRepairDialogLanguage();
    renderEnvironment();
  });
  $('#remember-settings').checked = state.settings.remember;
  $('#remember-settings').addEventListener('change', (event) => { state.settings.remember = event.target.checked; localStorage.setItem('frameproof.remember', String(state.settings.remember)); });
  $('#open-result-setting').checked = state.settings.openResult;
  $('#open-result-setting').addEventListener('change', (event) => { state.settings.openResult = event.target.checked; localStorage.setItem('frameproof.openResult', String(state.settings.openResult)); });

  document.addEventListener('keydown', (event) => {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommandPalette(); }
    if (command && event.key.toLowerCase() === 'n') { event.preventDefault(); resetScan(); }
    if (command && event.key === 'Enter') { event.preventDefault(); runScan(); }
  });
};

const restoreScanSettings = () => {
  if (!state.settings.remember) return applyMode('recommended');
  try {
    const saved = JSON.parse(localStorage.getItem('frameproof.scanSettings') || 'null');
    if (!saved) return applyMode('recommended');
    applyMode(['recommended','fast','strict'].includes(saved.mode) ? saved.mode : 'recommended');
    if (saved.preset !== undefined) $('#preset-select').value = saved.preset;
    if (saved.aspect) $('#aspect-select').value = saved.aspect;
    const config = saved.config || {};
    if (Number.isFinite(config.maxFrozenSeconds)) $('#freeze-slider').value = config.maxFrozenSeconds;
    if (Number.isFinite(config.safeMarginRatio)) $('#margin-slider').value = Math.round(config.safeMarginRatio * 100);
    if (Number.isFinite(config.maxEdgeActivityRatio)) $('#edge-slider').value = Math.round(config.maxEdgeActivityRatio * 100);
    $('#max-frames-input').value = config.maxFrames || '';
    for (const [key, selector] of Object.entries({checkBlankFrames:'#rule-blank',checkFrozenRuns:'#rule-frozen',checkEdgeActivity:'#rule-edge',checkAspect:'#rule-aspect',checkPlatformMetadata:'#rule-platform',checkCaptions:'#rule-captions',checkAudioIntegrity:'#rule-audio'})) {
      if (typeof config[key] === 'boolean') $(selector).checked = config[key];
    }
    if (saved.manifestPath) $('#manifest-path-input').value = saved.manifestPath;
    if (saved.captionsPath) $('#captions-path-input').value = saved.captionsPath;
    if (saved.captionLanguage) $('#caption-language-select').value = saved.captionLanguage;
    if (saved.overlay) $('#overlay-select').value = saved.overlay;
    if (saved.baselineReportPath) $('#baseline-report-input').value = saved.baselineReportPath;
    if (saved.acceptancesPath) $('#acceptances-path-input').value = saved.acceptancesPath;
    updateSliders();
    updateSummary();
  } catch {
    applyMode('recommended');
  }
};

const start = async () => {
  applyTheme();
  bindEvents();
  restoreScanSettings();
  applyLanguage();
  renderRuleCatalog();
  try {
    await Promise.all([bootstrap(), refreshRecent()]);
  } catch (error) {
    toast(error.message, 'error');
  }
};

start();
