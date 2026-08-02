# FrameProof v0.8.1 Release Candidate 修正監査

監査日：2026-08-02  
対象：v0.8.0公開前レビューで確認されたP0 2件・主要P1 8件

## 判定

**条件付きGo**。コード・パッケージ・ローカル統合テスト上の公開停止項目は解消しました。残る確認は、Public GitHub作成後のGitHub-hosted CI、npm Trusted Publishing、実Claude Code／Codex CLIの3点です。

## 修正結果

| ID | 旧問題 | 修正 | 検証 | 状態 |
|---|---|---|---|---|
| P0-1 | 古いMP4を新しいレンダー成果として受理できる | レンダー前後のsize・mtime・ctime・SHA-256を比較。同一バイト、時刻だけの更新、開始前の成果物を`stale-output`で拒否 | 無出力コマンドとtimestamp-only touchを再現 | Fixed |
| P0-2 | `allowedFiles=[]`でAgent変更制限が無効 | strict modeは許可範囲0件ならAgent起動前に停止。Studioも409 `REPAIR_SOURCE_UNMAPPED` | 明示overrideなし失敗、override時のみ実行 | Fixed |
| P1-1 | Studio APIに認証・Origin/Host検証なし | 起動ごとのランダムtoken、HttpOnly SameSite cookie、header認証、loopback Host、mutating Origin検証 | 401・403攻撃テスト | Fixed |
| P1-2 | `shell:true`と文字列テンプレート | executable＋argvへ正規化、shell演算子・command substitutionを拒否、全実行を`shell:false` | `&&`拒否テスト | Fixed |
| P1-3 | THREAT_MODELが実装と不一致 | Agent、Studio、render freshness、資源上限、CI、残存リスクを全面更新 | Release validator | Fixed |
| P1-4 | Release tagとpackage version不一致を検出しない | publish Workflowで`GITHUB_REF_NAME`と`package.json.version`を比較 | Release validator | Fixed |
| P1-5 | GitHub Actionsがmutable ref | checkout/setup-node/upload-artifact/codeql-actionを40桁SHAへ固定 | Workflow走査validator | Fixed |
| P1-6 | onboarding Workflowが過剰権限 | 既定権限を`contents: read`だけに限定。SARIF uploadは明示的な別例のみ | onboarding test・source audit | Fixed |
| P1-7 | Agent権限と環境が広い | ClaudeはRead/Edit/Write/Glob/Grepのみ、Codexはephemeral workspace-write・plugins off、環境変数allowlist | secret非転送テスト | Fixed |
| P1-8 | 長尺解析の上限・中断が弱い | 既定108,000 frame、20分timeout、CLI/Action override、AbortSignal対応、Studio切断時cancel | frame budget test | Fixed |

## 最終テスト

- automated tests: 60 passed / 0 failed
- line coverage: 87.41%
- branch coverage: 65.75%
- function coverage: 88.98%
- npm audit: 0 vulnerabilities
- npm runtime dependencies: 0
- clean npm install smoke test: passed
- Release metadata validation: passed
- Claude Code/Codex compatibility validation: passed
- render-health real demo and receipt regeneration: passed

## 攻撃的回帰テスト

1. 既存動画を置き、何も生成しないコマンドを実行 → `stale-output`で失敗。
2. 既存動画へtouchだけ実行 → SHA-256同一のため失敗。
3. file-only reportからAgent sessionを作成 → 許可scopeなしでは起動前停止。
4. Studio APIをtokenなしで呼ぶ → 401。
5. 異なるOrigin／Hostから呼ぶ → 403。
6. `node render.mjs && echo unsafe` → shell operatorとして実行前拒否。
7. 解析上限1 frameで通常動画を検査 → decode開始前に安全停止。
8. 親プロセスへ秘密環境変数を設定しcustom Agent実行 → 子Agentへ転送されない。

## 残存リスク

- FFmpeg自体の脆弱性は、利用者が導入するFFmpeg配布物に依存します。
- custom Agent executableと`--allow-unmapped`は、利用者が明示的に信頼境界を緩める操作です。
- 同一バイトの決定論的再レンダーも安全側でstale判定します。必要なら将来、隔離一時出力＋atomic promotionを追加します。
- Windows/macOS/LinuxのGitHub-hosted CIと、実Claude Code／Codex認証環境での実行はPublic repository作成後に確認します。

## 公開条件

1. Public repository作成後、branch protectionとrequired checksを設定。
2. GitHub-hosted 3 OS CIをすべて成功させる。
3. npm Trusted Publisherを対象repository・workflowに限定して設定。
4. `v0.8.1` Release tagとpackage versionが一致することを確認。
5. 公開後、README例のFrameProof Action参照をrelease commit SHAへ更新する。
