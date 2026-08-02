# FrameProof 競合・動画制作者課題ディープリサーチ

調査日: 2026-08-02  
対象: FrameProof v0.3.0  
目的: 競争環境を再評価し、動画制作の実務上の「見落としやすい痛み」を製品要件へ変換する。

## 1. エグゼクティブサマリー

1. 前回調査後、直接競合として Auto QC が明確化した。動画・音声・OCR・セーフゾーン・プラットフォーム・PDF・改訂版比較を一つのSaaSにまとめている。
2. OSS/Agent領域では Kinocut が強い。ローカルMCP、事前ガードレール、品質ゲート、Video Receipt、Human Gateまで提供している。
3. 放送・配信向けの網羅的QCでは rendiff-probe、Vidchecker、Pulsar等が先行している。FrameProofが機能数で追うべき領域ではない。
4. Remotion/skills.shでは「生成するSkill」は急速に増えているが、「完成動画と生成コードを結び付け、修正まで閉ループ化するSkill」はまだ弱い。
5. 最大の未解決課題は、コードが実行できても画面が正しいとは限らないこと。PRISMでは実行成功から空間品質合格まで平均約41%低下した。
6. 実務では、最終書き出し時の音声欠落、フリーズ、字幕ズレ、プレビューとの差異が繰り返し報告されている。タイムラインではなく完成ファイルを検査する価値が高い。
7. AI生成動画では、文字が小さい、余白が過剰、モーションが弱い、意図した比率で見えない、長尺で整合性が崩れる問題が顕在化している。
8. 固定のセーフゾーンだけでは不足する。TikTokでは字幕長、追加機能、デバイス、表示段階、LTR/RTLで安全領域が変化する。
9. FrameProofは「汎用ファイルQC」ではなく、Source-aware / Intent-aware / Revision-aware / Agent-fixableを中核にすべきである。
10. 次期優先機能は、Render Manifest、Assertions SDK、字幕データ監査、音声完全性監査、改訂差分、プラットフォームUIプレビュー、Agent Fix Packetである。

## 2. 競合マップ

### 2.1 Auto QC — 最重要の直接競合

**位置づけ**: クラウド型の自動動画QC SaaS。

**強み**

- 15種類の映像・音声・AI・プラットフォーム検査
- 黒画面、フリーズ、悪いカット、枠、明るさ、ぼけ
- ラウドネス、クリッピング、無音、ノイズ、音声明瞭度
- OCR、109言語の誤字検出、字幕抽出、セーフゾーン
- ロゴ・ブランド権利リスク検出
- YouTube、TikTok、Instagram、Broadcast等のプリセット
- 問題をタイムラインへ配置し、PDFを出力
- 改訂版をアップロードし、前版の設定・dismiss状態を継承

**FrameProofへの脅威**

現在のStudio UX、タイムライン、ルール切替、プラットフォーム設定、HTML/PDF的レポートは重なる。単純に検査項目を追加するだけでは、Auto QCの小型OSS版に見える。

**弱点・差別化余地**

- クラウドアップロードが前提
- ベンダー内部のAI判定で再現性・根拠が見えにくい
- React/Remotionのどのコンポーネントが原因か分からない
- Git差分、PR、ソースコード修正まで一体化していない
- 「ゼロ誤検知」等はベンダー公称であり、独立検証ではない

### 2.2 Kinocut — 最重要のOSS/Agent隣接競合

**位置づけ**: AI Agent向けのローカル動画編集MCP、Pythonライブラリ、CLI。

**強み**

- ローカルファースト、Apache-2.0
- 142のMCPツール
- FFmpeg操作の型付けとサーバー側検証
- レンダリング前のpreflight guardrails
- レンダリング後のVideo Receipt
- 品質スコア、A/V同期、ラウドネス、字幕情報
- 人間確認ポイントと出所・ハッシュの記録
- Claude Code等のMCPクライアントに対応

**FrameProofへの脅威**

Agent、ローカル、品質ゲート、証跡というキーワードが重なる。MCPの操作面と制作フロー全体ではKinocutが先行する。

**差別化余地**

- Kinocutは主に「素材から縦型クリップを制作する実行層」
- FrameProofは「任意のプログラマティック動画を、ソース意図と完成フレームの両方から検証する層」に集中できる
- Remotion Composition / Sequence / Component / source fileまで問題を逆引きできれば別カテゴリになる

### 2.3 rendiff-probe — 技術QCの網羅競合

**位置づけ**: FFmpeg/FFprobeベースのプロ向けAPI・CLI。

**強み**

- 19カテゴリ、26解析器、121パラメータ
- 黒画面、フリーズ、レターボックス、色、ノイズ、ぼけ
- 音声、HDR、MXF、IMF、MPEG-TS、PSE、AFD
- REST、GraphQL、CLI、HLS、バッチ、Docker

**判断**

放送規格、HDR、MXF、IMF、ストリーム解析をFrameProofの主戦場にしない。必要時は外部エンジンとして連携する方が合理的。

### 2.4 Remotion / skills.sh エコシステム

**現状**

- remotion-best-practicesは大規模に普及
- Google StitchからRemotion動画を生成するSkillも急伸
- JSONタイムラインから動画を生成するSkill、レンダリングSkill、Visual Snapshot Skillが存在
- 生成、レンダリング、字幕、素材操作は急速にコモディティ化

**空白**

- 完成動画の欠陥をソースコードへ戻す
- 制作意図を宣言し、完成フレームで保証する
- Claude Code/Codexが修正し、再レンダリングし、合格まで回す
- PR上で「どの変更がどのフレームを悪化させたか」を説明する

### 2.5 商用放送QC

Telestream Vidchecker、Venera Pulsar等は放送局、OTT、大規模配信向け。フォーマット・規格・自動修正・大量処理では強いが、開発者向けRemotion CIやAgent修復は主目的ではない。

## 3. 動画制作で実際に発生している悩み

### 3.1 コードは動くが、画面は正しくない

- AIが文字を小さくしすぎる
- 横長動画で余白が過剰になり、スマホでは読めない
- 要素の比率が不自然
- 画面外、重なり、クロップが発生
- モーション量が不足し、スライドショー化する

PRISMは、コード実行成功と空間品質合格の間に平均約41%の落差を報告した。FrameProofの中心課題と一致する。

### 3.2 プレビューと最終書き出しが一致しない

実務報告には以下がある。

- 書き出し後だけ対話音声が欠落
- 完成ファイルに30秒のフリーズが混入
- 音声と映像がずれる
- タイムラインでは正常な字幕が書き出しでずれる
- 長尺番組で字幕が数分単位にずれる

したがって、ソースやプレビューの検査だけではなく、最終成果物のpostflightが不可欠。

### 3.3 字幕が「存在する」だけでは不十分

- 5〜15フレーム程度の遅延でも視聴者には明確に不自然
- 自動文字起こしの句読点・アポストロフィ・固有名詞が崩れる
- 行数、読速、表示時間、改行位置が不適切
- ハード字幕とUIが重なる
- 長さ変更後に字幕タイムコードが追従しない
- 書き出しに字幕が含まれない

OCRを最初から主軸にするより、SRT/VTT/Remotion caption JSONという正本データを利用した決定論的監査が先。

### 3.4 音声は最終確認の盲点

- 一部分だけ無音になる
- 対話チャンネルだけ欠落する
- BGMはあるため「音声あり」検査だけでは通過する
- 音量差、クリッピング、長い無音、左右チャンネル異常
- ナレーションの想定区間と実際の音声活動が一致しない

必要なのは単純なaudio stream存在確認ではなく、Expected Audio Manifestとの比較。

### 3.5 プラットフォームの安全領域は動的

TikTokでは安全領域が以下で変わる。

- 縦・横・正方形
- 字幕・キャプションの長さ
- Interactive Add-on
- デバイスモデル
- 開始3秒とフィード再生時
- 左書き・右書き言語

固定矩形だけでは誤った安心感を与える。実際のUIオーバーレイを選択してプレビューする必要がある。

### 3.6 修正のたびに同じ指摘をやり直す

- 前版で意図的にdismissした問題が再表示される
- 修正によってタイムコードがずれ、指摘位置を引き継げない
- 新規の悪化だけ見たい
- クライアント修正で「何が直り、何が残ったか」を説明したい

Auto QCが既にversion controlを製品化している。FrameProofはGitとソース情報を使い、より開発者向けに実装する必要がある。

### 3.7 Agentが問題を見つけても、修正箇所が分からない

現在の一般的なQC結果は、`01:23.450 freeze`で終わる。Agentが必要とするのは次。

- Composition名
- Sequence名
- React component名
- source fileと行
- props / asset / caption ID
- 問題フレーム
- 根拠画像・測定値
- 推奨修正
- 再現コマンド
- 再検証コマンド

### 3.8 レンダリング時間と失敗原因が読めない

- 長尺やOffthreadVideoで急激に遅くなる
- concurrencyを上げれば速いとは限らない
- Chrome、GPU、ファイルI/O、デコード、キャッシュのどこがボトルネックか分からない
- 失敗後に最初から再レンダリングする

将来的にRender Health Advisorが有効。ただし品質コア確立後に追加する。

### 3.9 主観品質は完全自動化できない

- 冒頭のフックが弱い
- 展開が遅い
- ブランドトーンが違う
- 長尺で物語の一貫性が崩れる
- AI映像の人物・物体・スタイルが途中で変わる
- 細かな動きの制御や修正が難しい

ここは「自動合否」ではなく、人間レビュー用チェックポイント、比較映像、証拠提示として支援する。

## 4. FrameProofの再定義

### 旧

Local-first automated quality checks for rendered videos.

### 新

**Source-aware verification and repair loops for programmatic video.**

日本語:

**AI・コード生成動画の制作意図、ソースコード、完成フレームを結び、公開前に検証・修復する品質レイヤー。**

## 5. 競争優位となる4原則

### 5.1 Source-aware

問題をタイムコードだけでなく、Composition / Sequence / Component / source fileへ戻す。

### 5.2 Intent-aware

「動いたか」ではなく、「動くべき区間で動いたか」「読めるべき文字が読めるか」「鳴るべき区間で音があるか」を検査する。

### 5.3 Revision-aware

前版と新版を整列し、新規問題、解消問題、悪化、許容済みを分ける。

### 5.4 Agent-fixable

Claude Code/Codexがそのまま修正に使えるFix Packetを出す。

## 6. 推奨ロードマップ

### P0 / v0.4 — 制作意図と完成物をつなぐ

1. **Render Manifest**
   - Composition、Sequence、source、asset、caption、audio、時間範囲を出力
2. **Assertions SDK**
   - ExpectMotion
   - ExpectTextSize
   - ExpectVisible
   - ExpectAudio
   - ExpectSafeArea
3. **Caption Data QA**
   - SRT、VTT、Remotion caption JSON
   - 行数、文字数、CPS、表示時間、改行、gap、範囲外、欠落
4. **Audio Integrity**
   - dialogue expected区間の無音
   - チャンネル欠落
   - loudness、clipping、長い無音
5. **Agent Fix Packet v1**
   - source、frame、evidence、suggested action、repro、verify
6. **Platform Preview Overlay**
   - TikTok、Reels、Shorts、X
   - デバイス、caption length、配置、LTR/RTL

### P1 / v0.5 — 改訂版とGit差分

1. baseline / revision comparison
2. time alignment
3. accepted/dismissed issue inheritance
4. new / fixed / regressed classification
5. visual diff filmstrip
6. GitHub PR comment
7. SARIF / JUnit

### P2 / v0.6 — 修復ループ

1. Claude Code/Codex repair orchestration
2. source patch proposal
3. selective rerender
4. automatic re-audit
5. confidence and human approval gate

### P3 / v0.7 — 制作運用

1. Render Health Advisor
2. fonts/assets/dependencies preflight
3. render receipt and provenance
4. optional C2PA integration
5. optional local OCR/vision plugin
6. subjective human review checklist

## 7. v0.4で実装しないもの

- 放送規格121項目の網羅
- MXF / IMF / Dolby Visionの完全対応
- クラウドOCRを必須化
- 自動著作権判定
- AIによる「面白さ」の単一スコア
- 汎用動画編集MCPの再実装

## 8. Studio UXへの具体的変更

### 新しい開始画面

- 「完成動画だけを検査」
- 「Remotionプロジェクトと一緒に検査」
- 「前の版と比較」

### 結果画面

各問題カードに以下を表示。

- 問題のフレーム
- 期待値 / 実測値
- source component
- 修正候補
- Claude Codeで修正
- Codexで修正
- 修正後に再検査

### Platform Preview

実動画上に投稿先UIを重ねる。単純な緑枠ではなく、ユーザー名、キャプション、ボタン、ロゴ、デバイス差を再現する。

### Revision View

- 新規
- 悪化
- 解消
- 以前から許容

の4列で示す。

## 9. 成功指標

### 技術

- 問題の80%以上にsource locationを付与
- 同一入力で同一結果
- Agent Fix Packet schema安定
- 5分動画を一般的な開発PCで実用時間内に監査

### 利用価値

- 手作業の全編見直し時間を50%以上削減
- 改訂版確認時間を70%以上削減
- 最終書き出しの音声欠落・フリーズ・字幕ズレを公開前に検出
- 外部ユーザーが実際にClaude Code/Codexで修正ループを完走

### OSS申請

- 外部導入3件以上
- 外部Issue 5件以上
- 外部PR 2件以上
- RemotionまたはAgentエコシステムからの参照
- 実際の保守・修復にCodex APIクレジットを使う明確な計画

## 10. 調査上の注意

- Auto QCの精度、誤検知率、処理速度は公開マーケティング情報であり、独立したベンチマークではない。
- Adobe Communityはユーザー報告であり、すべての環境で再現するとは限らない。ただし最終書き出しの検査需要を示す実務証拠として有効。
- プラットフォーム仕様は変化するため、プリセットは日付・出典・バージョンを持つべき。
- 主観品質は自動合否ではなく、人間の判断を速くする補助として扱う。

## 11. 主な参照先

- Auto QC: https://www.autoqc.app/
- Auto QC Features: https://www.autoqc.app/features
- Auto QC Documentation: https://www.autoqc.app/resource/document
- Kinocut: https://kinocut.dev/
- rendiff-probe: https://github.com/rendiffdev/rendiff-probe
- Remotion issue #7256: https://github.com/remotion-dev/remotion/issues/7256
- PRISM: https://arxiv.org/abs/2605.19382
- TikTok Ads specifications: https://ads.tiktok.com/help/
- Adobe Premiere Community: https://community.adobe.com/
- Remotion Skills: https://www.skills.sh/remotion-dev/skills/remotion-best-practices
