// Shared by the Playwright tests: before any visual check reads the page, stop the game clock and let every
// transition and animation in the arena finish. CSS animations run on real time while the game runs on Playwright's
// fake clock, so without this a check can catch a bar mid-fade or a card mid-glow and fail at random.
//
//   await settleArena(page)   // the game clock is paused from here on; move it on with page.clock.runFor(ms)

// Pause the fake clock where it is (no timers fire until runFor / resume)
async function pauseClock(page) {
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now);
}

// Every finite animation or transition on the stage (the drakes' idle bob loops forever and is left out)
function arenaAnimationsDone() {
    const stage = document.getElementById('stage') || document.body;
    const running = document.getAnimations().filter(a => {
        const t = a.effect && a.effect.target;
        return t && stage.contains(t) && a.effect.getTiming().iterations !== Infinity && a.playState !== 'finished';
    });
    return Promise.all(running.map(a => a.finished.catch(() => null))).then(() => running.length);
}

async function settleArena(page) {
    await pauseClock(page);
    // A moment of real time (not requestAnimationFrame: the fake clock owns that too, and it is paused), so style
    // changes made by the last step have started their transitions; then wait them all out, again in case finishing
    // one started another (a delayed transition)
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(40);
        if (!(await page.evaluate(arenaAnimationsDone))) break;
    }
}

module.exports = { settleArena, pauseClock, arenaAnimationsDone };
