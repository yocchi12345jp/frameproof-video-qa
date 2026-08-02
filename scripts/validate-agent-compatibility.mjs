import {access, readFile} from 'node:fs/promises';

const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'skills/generated-video-auditor/SKILL.md',
  'skills/generated-video-auditor/scripts/audit-video.mjs',
  'docs/AGENT_COMPATIBILITY.md',
  'docs/AGENT_MAINTENANCE.md'
];

for (const file of requiredFiles) await access(file);

const skill = await readFile('skills/generated-video-auditor/SKILL.md', 'utf8');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatter) throw new Error('Canonical SKILL.md must begin with YAML frontmatter');
if (!/^name:\s*generated-video-auditor\s*$/m.test(frontmatter[1])) {
  throw new Error('Canonical SKILL.md name is missing or invalid');
}
if (!/^description:\s*\S.+$/m.test(frontmatter[1])) {
  throw new Error('Canonical SKILL.md description is missing');
}

const prohibited = [
  'context: fork',
  'hooks:',
  '${CLAUDE_SKILL_DIR}',
  '${CLAUDE_SESSION_ID}',
  'mcp__',
  'codex --dangerously',
  'claude --dangerously'
];
for (const token of prohibited) {
  if (skill.includes(token)) throw new Error(`Canonical SKILL.md contains agent-specific construct: ${token}`);
}

const agents = await readFile('AGENTS.md', 'utf8');
if (!agents.includes('skills/generated-video-auditor/SKILL.md')) {
  throw new Error('AGENTS.md must point Codex to the canonical skill');
}
if (!agents.includes('npm run check')) throw new Error('AGENTS.md must include the release check');

const claude = await readFile('CLAUDE.md', 'utf8');
if (!claude.includes('skills/generated-video-auditor/SKILL.md')) {
  throw new Error('CLAUDE.md must point Claude Code to the canonical skill');
}
if (!claude.includes('@docs/AGENT_MAINTENANCE.md')) {
  throw new Error('CLAUDE.md must import shared maintenance guidance');
}

for (const readmePath of ['README.md', 'README.ja.md']) {
  const readme = await readFile(readmePath, 'utf8');
  if (!readme.includes('--agent claude-code') || !readme.includes('--agent codex')) {
    throw new Error(`${readmePath} must document installation for Claude Code and Codex`);
  }
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
for (const packagedFile of ['AGENTS.md', 'CLAUDE.md', 'skills', 'docs/AGENT_COMPATIBILITY.md', 'docs/AGENT_MAINTENANCE.md']) {
  if (!packageJson.files?.includes(packagedFile)) {
    throw new Error(`npm package files must include ${packagedFile}`);
  }
}

console.log('Claude Code and Codex compatibility validation passed.');
