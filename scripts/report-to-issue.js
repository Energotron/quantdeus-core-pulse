const fs = require('fs');
const { execSync } = require('child_process');

const reportPath = '/tmp/quantdeus-report.json';
if (!fs.existsSync(reportPath)) { console.log('No report'); return; }

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const now = new Date(report.timestamp);

let body = `## 🌌 QuantDeus Pulse — ${now.toUTCString()}\n\n`;
for (const r of report.results) {
  body += `### ${r.pillar}\n`;
  if (r.status === 'ok' && r.data) {
    for (const source of r.data) {
      if (source.headlines?.length) {
        source.headlines.forEach(h => { body += `- ${h}\n`; });
      }
    }
  } else if (r.error) {
    body += `⚠️ ${r.error}\n`;
  }
  body += '\n';
}
body += '---\n*Next pulse in 6 hours*\n';

fs.writeFileSync('/tmp/issue-body.md', body);
try {
  execSync(`gh issue create --title "🌌 Pulse ${now.toISOString().slice(0, 13)}:00" --body-file /tmp/issue-body.md`,
    { stdio: 'pipe', env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN } });
  console.log('Issue created');
} catch(e) {
  console.error(e.stderr?.toString() || e.message);
  process.exitCode = 1;
}
