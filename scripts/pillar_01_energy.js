async function scan(browser) {
  const page = await browser.newPage();
  const findings = [];
  try {
    await page.goto('https://news.google.com/search?q=fusion+energy+renewable+breakthrough&hl=en', { waitUntil: 'networkidle', timeout: 15000 });
    const headlines = await page.$$eval('article h3, article h4', els => els.slice(0, 5).map(el => el.textContent.trim()));
    findings.push({ source: 'Google News', headlines });
  } catch (err) {
    findings.push({ source: 'error', error: err.message });
  }
  await page.close();
  return findings;
}
module.exports = { scan };
