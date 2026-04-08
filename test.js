const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('framenavigated', async (frame) => {
        if (frame === page.mainFrame()) {
            console.log('Navigated to: ' + frame.url());
        }
    });
    console.log('going to index');
    await page.goto('http://localhost:5176/');
    console.log('clicking My Work');
    await Promise.all([
        page.waitForNavigation(),
        page.click('a[href="work.html"]')
    ]);
    console.log('Waiting 5s to see if it reloads');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();
