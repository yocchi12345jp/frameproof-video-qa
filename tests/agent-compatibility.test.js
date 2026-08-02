import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('canonical Agent Skill remains portable across Claude Code and Codex', async () => {
  const skill = await readFile(new URL('../skills/generated-video-auditor/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^---\n[\s\S]*?name:\s*generated-video-auditor/m);
  assert.doesNotMatch(skill, /context:\s*fork|\$\{CLAUDE_SKILL_DIR\}|mcp__/);
});

test('both agent instruction files point to the canonical skill', async () => {
  const [agents, claude] = await Promise.all([
    readFile(new URL('../AGENTS.md', import.meta.url), 'utf8'),
    readFile(new URL('../CLAUDE.md', import.meta.url), 'utf8')
  ]);
  assert.match(agents, /skills\/generated-video-auditor\/SKILL\.md/);
  assert.match(claude, /skills\/generated-video-auditor\/SKILL\.md/);
});
