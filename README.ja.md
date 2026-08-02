# FrameProof Video QA

[English README](README.md)

**AI・コード生成動画の制作意図、ソースコード、完成フレームを結び、公開前に検証・修復する品質レイヤーです。**

FrameProofは完成動画だけでなく、字幕ファイル、完成書き出しの音声、Render Manifestを同時に監査します。Render Manifestを指定すると、問題をRemotionのComposition、Sequence、コンポーネント、ソースファイルと行番号へ戻せます。ローカルStudio、CLI、GitHub Action、Claude Code・Codex共通Agent Skillを提供します。

> 状態：v0.8.1 Release Candidate。既存MP4の誤認防止、ソース未特定修復のFail Closed、Studio APIの起動ごと認証、シェル解釈の廃止、長尺解析の資源上限を追加しました。v0.8では本番検査とレンダー健全性レシートを実装しています。

## 解決する問題

- コードは正常でも、完成動画では黒フレームや停止が発生する
- AIが文字を小さく作り、余白だけが広くなる
- 動くべき区間でアニメーションが動いていない
- 字幕が短すぎる、速すぎる、重複する、UIと衝突する
- プレビューでは聞こえた音声が完成MP4から欠落する
- 画面比率、FPS、コーデック、尺、容量が投稿先に合わない
- 問題フレームは分かっても、修正すべきソースを特定できない

各指摘には、ソース位置、期待値、実測値、推奨修正、再現コマンド、検証コマンドを含む**Fix Packet**を付与します。

## 必要環境

- Node.js 20以上
- FFmpegとFFprobe

npmの実行時依存はありません。動画とレポートを外部サービスへ送信しません。

## 3コマンドの導入フロー

```bash
npx frameproof-video-qa doctor
npx frameproof-video-qa init --video out/video.mp4
npx frameproof-video-qa verify
```

`init`はRemotionを自動判定し、既存ファイルを上書きせずに`.frameproof/project.json`、推奨設定、許容済み指摘ファイル、無効状態のManifest例を作成します。`verify`はJSON、HTML、Fix Packet、SARIF、JUnit、検証サマリーを`.frameproof/artifacts/latest`へまとめます。

完成動画とレポートを人間が確認した後、基準版として昇格します。

```bash
npx frameproof-video-qa baseline set .frameproof/artifacts/latest/report.json
npx frameproof-video-qa baseline status
```

詳細は[プロジェクト導入](docs/ONBOARDING.md)と[環境診断](docs/DOCTOR.md)を参照してください。

## Studio

```bash
npx frameproof-video-qa studio
```

WindowsのソースZIPでは`START_STUDIO.cmd`をダブルクリックできます。

Studioでは以下を操作できます。

- 動画のドラッグ＆ドロップ、選択、ローカルパス指定
- 推奨・高速・厳格・カスタム設定
- Render ManifestとSRT／VTT／JSON字幕の指定
- フレーム、字幕、音声、制作意図、投稿先仕様の監査
- TikTok、Reels、Shorts、XのUIオーバーレイ表示
- 問題タイムラインから該当時刻へ移動
- ソース位置の確認とFix Packetのコピー
- Claude Code／Codex向け修正指示のコピー
- 前版レポートとの比較と許容済み指摘の継承

UIオーバーレイはデバイスやアプリ版による違いを考慮した目安であり、全端末のピクセル単位保証ではありません。

![ソース位置とFix Packetを表示した結果画面](docs/images/v0.4/studio-fix-packet-v0.4.png)

## 通常スキャン

```bash
npx frameproof-video-qa scan video.mp4 \
  --aspect 16:9 \
  --json artifacts/frameproof.json \
  --html artifacts/frameproof.html
```

## ソース対応スキャン

```bash
npx frameproof-video-qa manifest validate .frameproof/manifest.json

npx frameproof-video-qa scan out/video.mp4 \
  --manifest .frameproof/manifest.json \
  --captions out/captions.srt \
  --audio --check-silence \
  --json artifacts/frameproof.json \
  --html artifacts/frameproof.html \
  --fix-packets artifacts/fix-packets.json
```

詳細は[Remotion連携](docs/REMOTION_INTEGRATION.md)と[Manifest JSON Schema](docs/frameproof-manifest.schema.json)を参照してください。

## 改訂比較

```bash
npx frameproof-video-qa scan out/current.mp4 \
  --manifest .frameproof/manifest.json \
  --baseline .frameproof/baseline.json \
  --acceptances .frameproof/acceptances.json \
  --json artifacts/current.json \
  --revision-json artifacts/revision.json \
  --revision-html artifacts/revision.html \
  --markdown artifacts/frameproof-pr.md \
  --sarif artifacts/frameproof.sarif \
  --junit artifacts/frameproof.xml
```

基準レポートを指定した場合、CIを止めるのは新規または悪化したエラーです。以前から変わらない問題は表示を残しますが、改訂ゲートは止めません。人間が確認した例外は`.frameproof/acceptances.json`へ保存できます。

詳細は[改訂ワークフロー](docs/REVISION_WORKFLOW.md)と[CI出力](docs/CI_OUTPUTS.md)を参照してください。

## Assertions SDK

```ts
import {createManifestBuilder, saveManifest} from 'frameproof-video-qa';

const manifest = createManifestBuilder({
  compositionId: 'ProductLaunch',
  fps: 30,
  durationInFrames: 900,
  width: 1080,
  height: 1920
})
  .region({
    id: 'cta-primary',
    role: 'cta',
    from: 720,
    to: 899,
    source: {file: 'src/scenes/CtaScene.tsx', line: 42},
    box: {x: 0.1, y: 0.78, width: 0.8, height: 0.14},
    style: {fontSizePx: 44, lineCount: 2}
  })
  .expectMotion({id: 'cta-entry', from: 720, to: 750, regionId: 'cta-primary', expected: {minimumChange: 0.08}})
  .expectText({id: 'cta-copy', from: 720, to: 899, regionId: 'cta-primary', expected: {minimumPx: 42, maximumLines: 2}})
  .build();

await saveManifest('.frameproof/manifest.json', manifest);
```

Assertionは`motion`、`text`、`visible`、`audio`、`safe-area`に対応します。現在の文字検査はManifestへ宣言した`fontSizePx`と`lineCount`を使います。OCRやDOM自動計測ではありません。

## 字幕・音声

字幕はSRT、WebVTT、Remotion形式のCaption配列、単語／セグメントJSONに対応します。表示時間、読速、行数、言語別1行文字数、重複、間隔、動画尺超過、宣言UI領域との衝突を検査します。

音声は完成動画を対象に、音声ストリームの有無、長い無音、統合ラウドネス、True Peakを検査します。一般的な音声検査は`--audio`で有効化し、長い無音の一般警告は`--check-silence`を指定します。Manifestに`ExpectAudio`がある場合は、その区間を自動確認します。

## Claude Code・Codex

```bash
npx skills add yocchi12345jp/frameproof-video-qa \
  --skill generated-video-auditor \
  --agent claude-code \
  --agent codex
```

両エージェントは同じ`SKILL.md`とFix Packetを使用します。Claude Codeには`CLAUDE.md`、Codexには`AGENTS.md`でリポジトリ固有指示を与えます。

## GitHub Action

```yaml
- uses: yocchi12345jp/frameproof-video-qa@v0.8.1
  with:
    video: out/video.mp4
    manifest: .frameproof/manifest.json
    captions: out/captions.srt
    audio: true
    preset: x-video
    json-report: artifacts/frameproof.json
    html-report: artifacts/frameproof.html
    fix-packets: artifacts/fix-packets.json
    baseline-report: .frameproof/baseline.json
    acceptances: .frameproof/acceptances.json
```

## 保護付き修復ループ

品質ゲートが失敗した場合は、Fix PacketからClaude Code／Codex向け修復セッションを作成できます。Agent実行とレンダーには個別の明示承認が必要で、想定外ファイル変更は停止します。合格後も自動承認せず、人間確認と署名付き受領記録で終了します。詳細は[修復ループ](docs/REPAIR_LOOP.md)を参照してください。

## 終了コード

- `0`：エラーなし。基準レポート使用時は新規・悪化エラーなし
- `1`：通常スキャンのエラー、または改訂比較の新規・悪化エラー。`--fail-on-warning`では警告も対象
- `2`：入力、設定、Manifest、環境エラー

MIT Licenseです。
