// Run with node --test tests/ring-sale.test.cjs [from either branch].
// Execute the real confirmation handler, stock builder and save/load functions.
// Rendering and audio are stubbed; no browser or external packages are needed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
function fn(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}
function harness() {
    const saved = new Map();
    const noop = () => {};
    const c = {
        player: {}, shopSelection: 0, shopConfirmSelection: 0, shopRingPriceMult: 1,
        shopBuyStock: [], SOUNDS: { GET_ITEM: noop, SELECT: noop },
        updateUI: noop, addLog: noop, addKeyLog: noop, spawnFloatingText: noop,
        safeStorageSetJSON: (k, v) => saved.set(k, JSON.stringify(v)),
        safeStorageGetJSON: (k, fallback) => saved.has(k) ? JSON.parse(saved.get(k)) : fallback,
        safeStorageSet: noop,
    };
    // Seed unrelated save fields with inert values; use the actual serialization code.
    for (const [, name] of fn('saveGame').matchAll(/:\s*([\w]+)\s*[,\n]/g)) {
        if (!(name in c) && name !== 'player') c[name] = false;
    }
    c._killedEnemyTypes = new Set();
    vm.createContext(c);
    for (const [name, end] of [['RINGS', '\n];'], ['SYMBOLS', '\n};']]) {
        const start = source.indexOf(`const ${name} =`);
        vm.runInContext(source.slice(start, source.indexOf(end, start) + end.length) + `\nthis.${name} = ${name};`, c);
    }
    for (const name of ['buildShopSellStock', 'saveGame', 'loadGame']) vm.runInContext(fn(name), c);
    const start = source.indexOf("    if (gameState === 'CONFIRM_BUY') {");
    const end = source.indexOf("    if (gameState === 'CONFIRM_ESCAPE') {", start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(`this.confirm = function(e) {${source.slice(start, end)}}`, c);
    c.sell = (id, choice = 0) => {
        c.shopStock = c.buildShopSellStock();
        c.shopSelection = c.shopStock.findIndex(i => i.type === 'sell_ring' && i.ringId === id);
        assert.ok(c.shopSelection >= 0, 'ring is offered for sale');
        const price = c.shopStock[c.shopSelection].sellPrice;
        c.gameState = 'CONFIRM_BUY'; c.shopConfirmSelection = choice;
        c.confirm({ key: 'Enter', preventDefault: noop });
        assert.equal(c.gameState, 'SHOP');
        return price;
    };
    c.roundtrip = () => {
        const before = JSON.stringify(c.player);
        c.saveGame();
        const expected = JSON.parse(before);
        c.player = {};
        assert.equal(c.loadGame(), true);
        for (const field of ['ownedRings', 'equippedRings', 'gold']) {
            assert.equal(JSON.stringify(c.player[field]), JSON.stringify(expected[field]), field);
        }
    };
    return c;
}
const ring = 'STEALTH_RING';
for (const [count, equipped, expected] of [
    [3, [null, null], [null, null]],
    [3, [ring, ring], [ring, ring]],
    [2, [ring, ring], [ring, null]],
    [2, [null, ring], [null, ring]],
    [1, [ring, null], [null, null]],
    [1, [null, ring], [null, null]],
    [1, [ring, 'LIFE_RING'], [null, 'LIFE_RING']],
]) {
    test(`${count} -> ${count - 1}, equipment ${JSON.stringify(equipped)}`, () => {
        const c = harness();
        c.player = { x: 1, y: 1, gold: 100, ownedRings: [ring, ...Array(count - 1).fill(ring), 'LIFE_RING'], equippedRings: equipped.slice() };
        const price = c.sell(ring);
        assert.equal(c.player.ownedRings.filter(id => id === ring).length, count - 1);
        assert.equal(c.player.ownedRings.filter(id => id === 'LIFE_RING').length, 1);
        assert.equal(JSON.stringify(c.player.equippedRings), JSON.stringify(expected));
        assert.equal(c.player.gold, 100 + price);
        assert.equal(c.shopStock.some(i => i.ringId === ring), count > 1);
        c.roundtrip();
    });
}
test('repeat sales after loading: 3 -> 2 -> 1 -> 0', () => {
    const c = harness();
    c.player = { gold: 0, ownedRings: [ring, ring, ring], equippedRings: [ring, ring] };
    let gold = 0;
    for (let count = 2; count >= 0; count--) {
        gold += c.sell(ring);
        assert.equal(c.player.ownedRings.length, count);
        assert.equal(c.player.equippedRings.filter(Boolean).length, Math.min(count, 2));
        assert.equal(c.player.gold, gold);
        c.roundtrip();
    }
});
test('NO leaves inventory, equipment and gold unchanged', () => {
    const c = harness();
    c.player = { gold: 100, ownedRings: [ring, ring], equippedRings: [ring, ring] };
    const before = JSON.stringify(c.player);
    c.sell(ring, 1);
    assert.equal(JSON.stringify(c.player), before);
});
for (const id of ['TERRAIN_RING', 'SUMMON_RING']) {
    test(`${id}: merchant unlock and stock preserved`, () => {
        const c = harness();
        c.player = { gold: 0, ownedRings: [id, id], equippedRings: [id, null] };
        c.sell(id);
        assert.equal(c.player.ownedRings.length, 1);
        assert.equal(c.player.equippedRings[0], id);
        assert.equal(c[id === 'TERRAIN_RING' ? 'terrainRingMerchantUnlocked' : 'summonRingMerchantUnlocked'], true);
        assert.equal(c.shopBuyStock.filter(i => i.type === 'ring').length, 1);
        c.roundtrip();
    });
}
