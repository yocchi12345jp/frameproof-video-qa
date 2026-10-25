# P15｜『人類とお金』EP00 最終 MP4 QA 実行手順（下書き）

> 状態：`DRAFT / NOT_EXECUTED`。この文書は実行手順の切り分けであり、EP00 の最終 MP4 を合格にするものではない。最終判定は、実装者とは別の Muse または ChatGPT が、実ファイルと証拠を読み戻して行う。

## 0. 適用範囲と境界

- 対象は P15 の内部制作候補『人類とお金』堂島 EP00 の最終 MP4。望月朔（P04）や仮想通貨ラインの素材・主張は混ぜない。
- この手順は、レンダー済み MP4 の機械検査、字幕・音声 sidecar の照合、代表フレームの生成、独立レビュー用の証拠束作成を扱う。
- YouTube 公開、外部納品、チャンネル変更、追加課金、未解決の権利コミットはこの手順の対象外で、別の Human Gate とする。
- 30 秒の無音 two-host canary、7 枚の PNG QA、レンダー成功、FrameProof の JSON PASS だけでは、最終作品の品質 PASS／公開可を意味しない。

## 1. 読み取り済みの正本と現状

読み取り基準は `p19-governance/company-ops-canonical@main` の commit `c329aa1303678b1abc99681b010a6848cb26f033` と、`yocchi12345jp/frameproof-video-qa@main` の commit `265f14044c0207522628c18879e786626fb6f3ae`（package `0.8.1`）とする。

| 根拠 | 現行の事実 | QA への影響 |
|---|---|---|
| `P15/work/P15-JINRUI-DOJIMA-EP00-COMPLETE-12MIN-PRODUCTION-DESIGN-20261023.md` | 設計値は 12:00、1920×1080、30fps、21,600 frames、48 beats、6 chapters。実音声・実 BGM・完成 MP4 の納品を意味しない | 720 秒を機械的に固定する前に、実測音声と最終編集を確定する |
| `P15/work/P15-JINRUI-DOJIMA-EP00-AUDIO-ASSET-MANIFEST-20261023.json` | `wav_master: NOT_CREATED`、`full_master: NOT_RENDERED`、台本の source review は未完 | この文書作成時点で EP00 最終 MP4 の QA 実行結果は存在しない |
| `P15/work/P15-JINRUI-DOJIMA-EP00-V2-VOICE-TIMING-BASIS-20261023.json` | 48 行の実測 TTS は未完、字幕・最終音楽も未生成、12 分 MP4 は未作成 | 仮の 15 秒 beat 時刻を字幕・音声の合格根拠にしない |
| `P03/work/P03-WP-JINRUI-DOJIMA-EP00-AUDIO-FULL-VIDEO-20261023-001.yaml` | 状態は `OWNER_ADMISSION_PENDING`。最終 gate は独立した聴取・音声・映像品質 | Owner admission と実音声の独立 QA が先行条件 |
| `P03/evidence/P03_JINRUI_DOJIMA_EP00_SEVEN_GRAPHICS_QA_20261023.json` | 7 枚の原図と 48 beat の画像結合だけが PASS。`full_12min_video_produced: false` | PNG QA を MP4 QA に読み替えない |
| `P00/VIDEO_PRODUCTION_GRAMMAR_V1.md` | G0–G7 の機械／独立 QA 後に G8 Human visual gate、canary 後に同じ ladder を全尺へ再実行 | 人間を最初の欠陥検出器にしない |

### 未確認の依存物

指示で指定された `video-qa v0.3.2` と `design v0.2.3` の pack 本体・正式パスは、今回読み取った canonical main、frameproof main、Drive の台帳検索では名前付き成果物として確認できなかった。Drive で確認できた `tinyexec@0.3.2` やハッシュ名のバイナリは、QA pack と同一視しない。実行前に Muse／ChatGPT が pack の正本パス、版、SHA-256、適用対象を読み戻すまで、pack の PASS や代替適用を主張しない。

## 2. 実行前の入力契約（ここは機械化できるが、入力の承認は手作業）

次の入力を同じ QA 作業フォルダに束ねる。元 MP4 は変更せず、全入力の SHA-256 を先に保存する。

| 入力 | 必須条件 | 判定者 |
|---|---|---|
| 最終 MP4 | P03 が出力した実ファイル。H.264/AAC 想定だが、実際の stream metadata を読む | スクリプト → 独立レビュー |
| 実測字幕 SRT/WebVTT/JSON | 実音声の開始・終了から生成。仮 beat 境界をそのまま流用しない | スクリプト → 独立レビュー |
| Render Manifest（存在する場合） | 生成元の composition/sequence/source を指す。無いものを作って source-aware と主張しない | スクリプト → 独立レビュー |
| 48 beat の最終台本・fact/rights receipt | JPX/NDL と編集注記を line 単位で参照 | P15／ChatGPT |
| QA pack | `video-qa v0.3.2`、`design v0.2.3` の正本パスと hash | Muse／ChatGPT |
| 受理情報 | P03 Owner admission、voice/BGM の採用と権利、最終 master の出力 hash | P03/P15／独立レビュー |

## 3. 実行手順

### 3.1 隔離と入力固定（スクリプト化）

専用の一時／成果物フォルダで実行し、制作リポジトリの source や既存 canary を上書きしない。以下は PowerShell の例で、パスは実行時に確定した値へ置き換える。

```powershell
$qaRoot = 'C:\Users\adach\Projects\p15-jinrui-dojima-ep00-final-qa-YYYYMMDD'
$finalMp4 = 'C:\path\to\EP00-final.mp4'
$captions = 'C:\path\to\EP00-final.srt'
$frameproofCli = 'C:\path\to\frameproof-video-qa\src\cli.js'
$h3Qa = 'C:\path\to\company-ops-canonical\P03\tools\h3_video_qa.py'

New-Item -ItemType Directory -Force -Path $qaRoot, "$qaRoot\artifacts", "$qaRoot\samples" | Out-Null
Get-FileHash -Algorithm SHA256 $finalMp4 | ConvertTo-Json | Set-Content "$qaRoot\input-mp4.sha256.json" -Encoding UTF8
if (Test-Path $captions) { Get-FileHash -Algorithm SHA256 $captions | ConvertTo-Json | Set-Content "$qaRoot\input-captions.sha256.json" -Encoding UTF8 }
ffprobe -v error -show_streams -show_format -of json $finalMp4 | Set-Content "$qaRoot\ffprobe.json" -Encoding UTF8
```

自動化できるのはファイル存在、hash、container/stream metadata、再現可能な保存先の作成までである。最終 MP4 がどれを指すか、音声 policy を `audio expected` とするか、pack の正本を採用するかは、別担当が読み戻す。

### 3.2 FrameProof の環境・設定検査（スクリプト化）

FrameProof は Node.js 20 以上と FFmpeg/FFprobe を必要とし、スキャンはローカルで完結する。初期化が必要な場合も、まず dry-run で生成対象を確認する。

```powershell
node $frameproofCli doctor --project $qaRoot --json-output > "$qaRoot\artifacts\doctor.json"
node $frameproofCli init --project $qaRoot --project-type generic --video $finalMp4 --dry-run
node $frameproofCli init --project $qaRoot --project-type generic --video $finalMp4
node $frameproofCli preflight --project $qaRoot --json "$qaRoot\artifacts\preflight.json"
```

`init` は未初期化の QA 作業フォルダだけで実行する。既存 project/config を `--force` で置き換えない。preflight の依存、font/asset、output permission、disk、Git 状態の error は、しきい値を緩めずに解消する。

### 3.3 FrameProof の最終 MP4 scan（スクリプト化）

Render Manifest が実在する場合は `manifest validate` を先に行い、字幕と最終 export の audio を同じ scan に渡す。Manifest が無い場合は `--manifest` を省略し、source-aware ではないと明記する。

```powershell
$scanArgs = @(
  'scan', $finalMp4,
  '--config', "$qaRoot\frameproof.config.json",
  '--caption-language', 'ja',
  '--fps', '30',
  '--aspect', '16:9',
  '--audio', '--require-audio', '--check-silence',
  '--max-unexpected-silence', '5',
  '--json', "$qaRoot\artifacts\frameproof.json",
  '--html', "$qaRoot\artifacts\frameproof.html",
  '--fix-packets', "$qaRoot\artifacts\fix-packets.json"
)
if (Test-Path $captions) { $scanArgs += @('--captions', $captions) }
$manifest = "$qaRoot\.frameproof\manifest.json"
if (Test-Path $manifest) {
  node $frameproofCli manifest validate $manifest
  $scanArgs += @('--manifest', $manifest)
}
node $frameproofCli @scanArgs
```

既存の baseline があるときだけ `--baseline`、`--acceptances`、`--revision-json`、`--revision-html`、`--markdown`、`--sarif`、`--junit` を追加する。baseline の更新は自動化しない。FrameProof の報告は deterministic evidence であり、字幕の意味・史実の正しさ・自然な演技を証明するものではない。

### 3.4 既存 P03 の byte/decode/audio delivery QA（スクリプト化）

新しい制御面を作らず、canonical に存在する `P03/tools/h3_video_qa.py` を補助的に再利用する。`--delivery-qa` では音声 policy を明示し、完全 decode、video stream、音声 stream、silence、入力 hash を記録する。

local checkout の同名ファイルが古い branch にある場合があるため、実行前に canonical `main` の commit と file hash を確認する。古い local copy の引数面を、現行 canonical の証拠として扱わない。

```powershell
python $h3Qa `
  --delivery-qa `
  --video $finalMp4 `
  --out-json "$qaRoot\artifacts\p03-delivery-qa.json" `
  --audio-expected `
  --max-silence-sec 5 `
  --silence-noise-db -60
```

このスクリプトの `DELIVERY_PASS` は byte/decode/audio の技術結果であり、視聴品質・意味品質・自然さの PASS ではない。EP00 の実音声から audible window が確定した場合だけ `--audible-window start:end` を追加する。冒頭 00:00–00:04 の意図した無音は、最終 mix の仕様と照合した上で `--intentional-silence 0:4` として明示する。

### 3.5 証拠の束ね（スクリプト化）

次のファイルを同じ成果物フォルダに保存し、各ファイルの hash と生成コマンドを receipt に書く。

- `input-mp4.sha256.json`、`input-captions.sha256.json`（存在時）、`ffprobe.json`
- `doctor.json`、`preflight.json`
- `frameproof.json`、`frameproof.html`、`fix-packets.json`
- `p03-delivery-qa.json`
- 代表フレーム／contact sheet、SRT、Render Manifest（存在時）
- G0–G7 の判定、残 warning、独立レビュアー名、レビュー日時、未解決事項を記した review receipt

FrameProof の JSON/HTML/Fix Packet と P03 の delivery receipt は、同じ MP4 hash に結び付ける。hash が一致しない証拠は一つの QA run に混ぜない。

## 4. 手作業として残す品質確認

次は機械検査の代替にならず、実映像・実音声を別担当が確認する。

| 確認 | 方法 | 合格を出せる人 |
|---|---|---|
| G0 story/shot contract | 48 beat の `new_information`、役割、主焦点、重複を台本・映像で突合 | Muse／ChatGPT |
| G1 geometry | 代表フレームを delivery size と 50% で確認。非一様伸縮、safe area、顔・出典との衝突を確認 | Muse／ChatGPT |
| G2 captions | 実音声との同期、発話どおりの文、最大 2 行、18–20 文字目安、漢字・禁則・視認性を実画面で確認 | Muse／ChatGPT |
| G3–G4 composition | 各 shot の entry/settled frame と contact sheet を見て、同じ画像の連続、card-grid monoculture、空白、font/color drift を確認 | Muse／ChatGPT |
| G5 motion | 1x 再生で jerk、timing、settle/hold、eye trace、transition motivation、loop/reset を確認 | Muse／ChatGPT |
| G6 audio | 先に声を聴き、誤読、アクセント、間、話者切替、字幕同期、BGM ducking、SFX cue を確認。LUFS/true peak は機械値と照合 | Muse／ChatGPT |
| G7 independent critique | 制作者と別のレビュアーが標準に照らし、`looks good` ではなく finding と時刻で記録 | Muse／ChatGPT |
| fact/rights | JPX/NDL の line receipt、出典表示、`1730年の写真` と誤認させないこと、架空価格・保証・売買推奨がないことを確認 | P15／ChatGPT |

### 自動化してはいけない判定

- FrameProof の edge activity を OCR／意味理解の証拠にしない。
- audio stream が存在することを、自然な声・正しいアクセント・演技の合格としない。
- 720 秒、48×15 秒、30fps の metadata 一致だけで、実音声に合わせた編集の合格としない。
- `DELIVERY_PASS`、`FrameProof verification: PASSED`、CI PASS、render receipt の存在だけで、quality PASS、Owner acceptance、公開可を宣言しない。
- 未確認の `video-qa v0.3.2`／`design v0.2.3` を別版で置き換えない。

## 5. 判定と停止条件

この runbook の終端は、次の 3 層を別々に記録した下書き receipt である。

1. `TECHNICAL_EVIDENCE`：hash、ffprobe、decode、FrameProof、P03 delivery QA。
2. `INDEPENDENT_QUALITY_REVIEW`：G0–G7、fact/rights、実視聴・実聴取。実施者は制作者と別。
3. `OWNER_OR_HUMAN_GATE`：P03/P15 の受理、rights／cost／外部公開の判断。該当しなければ `NOT_APPLICABLE` と明記。

技術結果が PASS でも、層 2 または必要な層 3 が未完なら状態は `DRAFT / REVIEW_PENDING` とする。baseline の set、修復 loop、PR merge、Drive 公開、YouTube upload はこの下書きから自動実行しない。

## 6. この下書きの検証結果

- 実施済み：canonical main の source-of-truth 読み取り、FrameProof main の CLI／Skill／docs 読み取り、P03 の既存 delivery QA の引数と限界の読み取り。
- 実施済み：FrameProof bundled `examples/demo/passing.mp4` に対する CLI scan の構文スモーク（30 frames、0 errors、1 `EDGE_ACTIVITY` warning。EP00 ではない）。JSON/HTML/Fix Packet の生成を確認した。
- 実施済み：canonical `origin/main` の `P03/tools/h3_video_qa.py` を stdin 実行し、同 fixture の `--delivery-qa --audio-not-expected` を `DELIVERY_PASS` で確認した。receipt は `perceptual_listening_qa: UNVERIFIED`、`semantic_qa: NOT_CLAIMED` のままであり、技術 PASS と品質 PASS を分離できている。
- 実施済み：`node --test` は 60/60 PASS、`node scripts/validate-agent-compatibility.mjs` は PASS。
- 検証差分：`node scripts/validate-release.mjs` は Windows checkout の CRLF と validator の LF 固定 frontmatter 正規表現（`scripts/validate-release.mjs:70`）により `SKILL.md must begin with YAML frontmatter` で失敗した。今回の下書きでは無関係な Agent Skill／改行を変更していない。`npm run check` はこの環境で `npm` が PATH に無く未実行。
- 未実施：EP00 最終 MP4 の QA、実音声・字幕・BGM の視聴、G0–G7 の独立レビュー、QA pack 本体の版確認、baseline promotion、公開／納品。

### 判断待ちとして記録する項目

- 最終 MP4 の実パスと SHA-256、最終 duration の採用値。
- P03 Owner admission と voice/BGM の採用・権利 receipt。
- `video-qa v0.3.2`／`design v0.2.3` の正本パス・hash。
- 既存 baseline を使うか、初回 scan として扱うか。

これらが確定した後も、まず代表フレームと実尺の音声を別担当が確認し、品質 PASS を付けてから横展開・公開の判断へ進む。
