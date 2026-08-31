#!/usr/bin/env node

const SITE_URL = 'https://elektron2345.wixsite.com/quantdeus';
const JOIN_TEXT = 'Присоединиться';
const FETCH_TIMEOUT_MS = 15000;

function stripTags(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderHref(href) {
  const value = String(href || '').trim().toLowerCase();
  return !value || value === '#' || value.startsWith('javascript:') || value === 'about:blank';
}

function inspectJoinTargets(html) {
  const anchors = [];
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const attrs = match[1];
    const text = stripTags(match[2]);
    if (!text.includes(JOIN_TEXT)) continue;
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    anchors.push({ text, href: hrefMatch ? hrefMatch[2].trim() : '' });
  }

  const allText = stripTags(html);
  const joinTextOccurrences = allText.split(JOIN_TEXT).length - 1;
  const usableTargets = anchors.filter(item => !isPlaceholderHref(item.href));

  return {
    joinTextOccurrences,
    anchorCount: anchors.length,
    usableTargetCount: usableTargets.length,
    targets: anchors,
  };
}

function assertSelfTest() {
  const fixture = `
    <main>
      <a href="/members/signup"><span>${JOIN_TEXT}</span></a>
      <a href="/members/login">${JOIN_TEXT}</a>
    </main>`;
  const result = inspectJoinTargets(fixture);
  if (result.joinTextOccurrences !== 2 || result.anchorCount !== 2 || result.usableTargetCount !== 2) {
    throw new Error(`Self-test failed: ${JSON.stringify(result)}`);
  }

  const broken = inspectJoinTargets(`<a href="#">${JOIN_TEXT}</a><button>${JOIN_TEXT}</button>`);
  if (broken.joinTextOccurrences !== 2 || broken.usableTargetCount !== 0) {
    throw new Error(`Broken-link self-test failed: ${JSON.stringify(broken)}`);
  }
  console.log('wix-join-smoke self-test: OK');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    assertSelfTest();
    return;
  }

  const response = await fetch(SITE_URL, {
    redirect: 'follow',
    headers: { 'user-agent': 'QuantDeus-Wix-Smoke/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Wix live fetch failed: HTTP ${response.status}`);

  const html = await response.text();
  const result = inspectJoinTargets(html);
  console.log(JSON.stringify({ url: response.url, ...result }, null, 2));

  if (result.usableTargetCount >= 2) return;
  if (result.joinTextOccurrences === 0) {
    throw new Error('Static HTML does not expose join controls; browser-rendered verification is required before claiming the Wix buttons work.');
  }
  throw new Error(`Expected 2 non-placeholder join links, found ${result.usableTargetCount}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { inspectJoinTargets, isPlaceholderHref };
