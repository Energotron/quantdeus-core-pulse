const fs = require('fs');
const { execFileSync } = require('child_process');

const reportPath = '/tmp/quantdeus-report.json';
if (!fs.existsSync(reportPath)) { console.log('No report'); return; }

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const now = new Date(report.timestamp);

let body = `## 🌌 QuantDeus Pulse — ${now.toUTCString()}\n\n`;
for (const r of report.results) {
  body += `### ${r.pillar}\n`;
  if (r.status === 'ok' && r.data) {
    let wroteFinding = false;
    for (const source of r.data) {
      if (source.headlines?.length) {
        source.headlines.forEach(h => { body += `- ${h}\n`; });
        wroteFinding = true;
      } else if (source.error) {
        body += `- ⚠️ ${source.source || 'Scanner'}: ${source.error}\n`;
        wroteFinding = true;
      }
    }
    if (!wroteFinding) {
      body += '- _No headlines found; scanner returned no usable items._\n';
    }
  } else if (r.error) {
    body += `⚠️ ${r.error}\n`;
  }
  body += '\n';
}
body += '---\n*Next pulse in 6 hours*\n';

fs.writeFileSync('/tmp/issue-body.md', body);
const title = `🌌 Pulse ${now.toISOString().slice(0, 13)}:00`;
const ghEnv = { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN };

try {
  const issues = JSON.parse(execFileSync('gh', [
    'issue', 'list',
    '--state', 'all',
    '--search', `${title} in:title`,
    '--json', 'title,url',
    '--limit', '10',
  ], { encoding: 'utf-8', env: ghEnv }));

  const existing = issues.find(issue => issue.title === title);
  if (existing) {
    console.log(`Issue already exists: ${existing.url}`);
    return;
  }

  execFileSync('gh', [
    'issue', 'create',
    '--title', title,
    '--body-file', '/tmp/issue-body.md',
  ], { stdio: 'pipe', env: ghEnv });
  console.log('Issue created');
} catch(e) {
  console.error(e.stderr?.toString() || e.message);
  process.exitCode = 1;
}
