async function scan(browser) {
  const page = await browser.newPage();
  const findings = [];
  try {
    await page.goto('https://news.google.com/search?q=AI+ethics+algorithmic+fairness+UBI&hl=en', { waitUntil: 'networkidle', timeout: 15000 });
    const headlines = await page.$$eval('article h3, article h4, article a[href]', els => {
      const titles = els
        .map(el => el.textContent.replace(/\s+/g, ' ').trim())
        .filter(text => text.length >= 12);
      return [...new Set(titles)].slice(0, 5);
    });
    findings.push({ source: 'Google News', headlines });
  } catch (err) {
    findings.push({ source: 'error', error: err.message });
  }
  await page.close();
  return findings;
}
module.exports = { scan };
