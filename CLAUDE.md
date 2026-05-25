# Minimal Rogue RPG — AI Modification Guide

## Overview
Turn-based roguelike in a single HTML/CSS/JS stack. Canvas rendering + Web Audio API (synthesized sounds, no external sound libs).
- **Goal:** Descend to B100F, destroy the Dungeon Core
- **Post-clear:** "Deep" mode (B101F+), endless with second ending possible
- **Map:** 25 rows × 40 columns, tile-based

## File Structure
```
index.html   — canvas, HUD elements, loads script.js (update `?v=N` on release)
style.css    — layout only (dark theme, no game logic)
script.js    — everything: data, logic, rendering (~38000+ lines)
bgm_*.mp3    — background music tracks (HTML Audio)
```

**Workflow tip:** this is a single-page HTML file — just open `index.html` in a browser to test. No build step. Bump `?v=NN` in the script tag when you want to bust the browser cache after editing.

---

## ⚠️ ABSOLUTE RULE — Enemy hostile color is ALWAYS `#f87171`

**When setting an enemy's color for a hostile/aggressive state, ALWAYS use `#f87171`. Never use `#ef4444` or any other red variant.**

- The standard hostile enemy color in this game is `#f87171` (see the LETTER type fallback in `draw()`)
- `#ef4444` is a brighter/different red and has been incorrectly used multiple times — do NOT use it for enemy `eColor`
- This applies to every new enemy type, every special enemy state, every `eColor =` assignment for hostile enemies, forever
- Damage text numbers and `spawnFloatingText` colors are separate and unaffected by this rule
- `_justAngered` temporary flash is also a separate effect and unaffected
- If you are about to write `eColor = '#ef4444'` — stop. Change it to `#f87171`

---

## ⚠️ ABSOLUTE RULE — addLog() is English-only

**`addLog()` must NEVER contain Japanese text. English only, always, without exception.**

- The bottom-left log panel is English-only by design. Japanese display capability does not exist there and will never be added.
- This applies to every `addLog()` call, in every situation, forever.
- Story/narrative text in Japanese → use `showStoryPages()` (dialogue window) instead.
- Item/action feedback in Japanese → use `spawnFloatingText()` instead.
- If you are about to write `addLog("...日本語...")` — stop. Rewrite it in English or use a different display method.

---

## ⚠️ 実装前チェックリスト（修正のたびに必ず確認）

### 1. 世界観・仕様を尊重する
- **グリッドに沿わない動きは絶対に入れない。** タイル座標（整数）以外での移動・描画をしない。
- **キャラクターサイズを統一する。** 既存敵より大きい・小さいフォントサイズを勝手に使わない。
- **仕様にないものを勝手に追加しない。** 新しいレンダリング方式・座標システム・エフェクトは明示的に許可を得てから追加。
- **新機能は「すでにある素材の組み合わせ」として実装する。** 既存の敵タイプ・タイル・システムを流用できないか先に検討する。

### 2. 大きな実装を始める前に必ず確認する
- **ゴールイメージを言語化してもらう：**「どんな見た目・動作を想定していますか？」
- **使う素材を確認する：**「既存の敵・タイル・システムを使いますか？」
- **世界観との整合性を確認する：**「他のどの部屋・敵に近いイメージですか？」
- 選択肢（AskUserQuestion）を使って確認してから実装に入る。

### 3. バグ報告を受けたら症状を先に聞く
- コードを先に読み始めない。まず「具体的にどんな操作でどうなりましたか？」と聞く。
- 現象を把握してから原因を絞り込む。

---

## コード内ナビゲーション早見表

### セクションジャンプ（grep）
すべてのセクション一覧：`grep -n "===== SECTION" script.js`

| セクション | grep コマンド |
|-----------|-------------|
| 定数・Canvas設定 | `grep -n "SECTION: CONSTANTS"` |
| 敵タイプセット | `grep -n "SECTION: ENEMY TYPE"` |
| 指輪データ | `grep -n "SECTION: RINGS DATA"` |
| ゲーム変数 | `grep -n "SECTION: GAME OBJECT"` |
| サウンド | `grep -n "SECTION: SOUND EFFECTS"` |
| BGM | `grep -n "SECTION: BGM"` |
| ゲーム状態フラグ | `grep -n "SECTION: GAME STATE"` |
| マップ・プレイヤー・敵データ | `grep -n "SECTION: CORE GAME DATA"` |
| セーブ/ロード | `grep -n "SECTION: SAVE"` |
| UI更新 | `grep -n "SECTION: UI UPDATES"` |
| マップ生成 | `grep -n "SECTION: MAP GENERATION"` |
| タイトル/ゲームオーバー描画 | `grep -n "SECTION: TITLE"` |
| メニュー/ショップ/ステータス描画 | `grep -n "SECTION: MENU"` |
| メイン draw() 関数 | `grep -n "SECTION: MAIN DRAW"` |
| ブロック設置 | `grep -n "SECTION: BLOCK PLACEMENT"` |
| フロア13スクロール壁 | `grep -n "SECTION: SCROLL WALL"` |
| プレイヤーアクション | `grep -n "SECTION: PLAYER ACTION"` |
| 妖精システム | `grep -n "SECTION: FAIRY"` |
| 狂人システム | `grep -n "SECTION: MADMEN"` |
| 敵死亡処理 | `grep -n "SECTION: ENEMY FALL"` |
| 敵ターン処理 | `grep -n "SECTION: ENEMY TURN"` |
| レーザーシステム | `grep -n "SECTION: LASER"` |
| 入力処理 | `grep -n "SECTION: INPUT"` |

### 特定フロアのコードへジャンプ
`initMap()` 内の各フロアブロック先頭に `// ----- FLOOR N:` マーカーがある：
```
grep -n "FLOOR 50:"  script.js   → 50Fのコードへ
grep -n "FLOOR 100:" script.js   → 100Fのコードへ
```

主要フロアは専用関数に抽出済み（`_initFloor50()` など）。
関数一覧：`grep -n "^function _initFloor"  script.js`

### 特定の敵AIブロックへジャンプ
`grep -n "// ===== AI: TYPE_NAME"` で `enemyTurn()` 内の各敵AIブロック先頭に飛べる。

### ENEMY_DEFS（敵ベーススタッツ参照テーブル）
`grep -n "^const ENEMY_DEFS"` で定義箇所へ。
ランダムスポーン cascade で使用。固定フロアの特殊スポーンは直接記述のまま。

---

## Key Constants (script.js top)
```js
TILE_SIZE = 20    // pixels per tile
ROWS = 25         // map height
COLS = 40         // map width
```

## SYMBOLS (tile types)
```js
SYMBOLS.WALL      '#'   SYMBOLS.FLOOR     '.'
SYMBOLS.STAIRS    '>'   SYMBOLS.DOOR      '+'
SYMBOLS.ICE       '~'   SYMBOLS.LAVA      '^'
SYMBOLS.POISON    '%'   SYMBOLS.GRASS     ','
SYMBOLS.BLOCK     'B'   SYMBOLS.CORE      'C'   // Boss core (100F)
SYMBOLS.MERCHANT  'M'   SYMBOLS.FIRE_BLOCK 'F'
```

---

## 用語・名称対照表

ユーザーとの会話で使われる通称と、コード内の正式名の対照表。
実際のシンボル記号は `script.js` の `const SYMBOLS = { ... }` (line 35) を参照。

> **敵指定のルール:** ユーザーが敵を指定する際は、**画面上に表示されるアイコン（アルファベット）を優先する**。内部コード名ではなく見た目の文字で指示が来るため、アイコン列を先に照合すること。例：「B を配置して」→ BOAR（`B`）であり、BLAZE（内部名）ではない。

### タイル・地形

| ユーザー通称 | コード名 | 記号 | ゲーム内表記 |
|------------|---------|------|------------|
| 床 | `FLOOR` | `·` | — |
| 壁 | `WALL` | `█` | — |
| 穴 | `STAIRS` | `◯` | "hole" |
| 出口 / 扉 | `DOOR` | `⊗` | "SEALED (⊗)" — KEY必須 |
| ワープ床 | `WARP_PAD` | `⊕` | "WARP!!" / "The spiral pulls you in!" |
| 氷の床 | `ICE` | `▢` | — |
| 溶岩 | `LAVA` | `~` | — |
| 毒沼 | `POISON` | `≈` | — |
| 草 | `GRASS` | `,` | — |
| ブロック | `BLOCK` | `□` | — |
| 炎の床 | `FIRE_FLOOR` | `*` | — |

### 敵キャラクター

| ユーザー通称 | コード名 | 記号 | 備考 |
|------------|---------|------|------|
| E / ノーマル | `NORMAL` | `E` | 基本敵 |
| G / ゴーレムオーク | `ORC` | `G` | 高HP・高ATK。オークの形をしたゴーレム（Golem Orc） |
| W / ブレイカー | `BREAKER` | `W` | 壁を破壊する |
| L | `LAYER` | `L` | 逃げながらブロックを置く |
| キーホルダー | `KEY_RUNNER` | `K`（赤） | 鍵を持って逃げる。コード名は KEY_RUNNER |
| 砲台 / T | `TURRET` | `T` | 固定レーザー |
| 炎敵 / B | `BLAZE` | `B` | 移動跡に溶岩を残す |
| 氷敵 / I | `FROST` | `I` | 移動跡に氷を残す |
| ボム / X | `BOMBER` | `X` | 死亡時に爆発 |
| $ | `GOLD` | `$` | 高額ゴールドドロップ |
| 亡霊 / 貧者の亡霊 | `PAUPER_SHADE` | `@`（赤明滅） | 無一文で死に冥途に渡れなかった冒険者の怨念。金を奪おうと徘徊する |
| KING | `KING` | `♛` | 深層101F+に0.1%で出現。生存中は全敵を強化するオーラ。死亡で全敵パニック。トロフィー対象（ステータス画面に♛表示） |

### アイテム

| ユーザー通称 | コード名 | 記号 |
|------------|---------|------|
| 鍵 / キー | `KEY` | `k` |
| 剣 | `SWORD` | `†` |
| 鎧 | `ARMOR` | `▼` |
| 指輪 | `RING` | `◎` |
| 回復魔導書 | `HEAL_TOME` | `☤` |
| 加速魔導書 | `SPEED` | `»` |
| 魅了魔導書 | `CHARM` | `☷` |

---

## Enemy System

### Enemy object shape
```js
{
  type: 'NORMAL',   // string key — see list below
  x: 5, y: 10,
  hp: 10, maxHp: 10,
  expValue: 5,
  faction: 'CRIMSON' | 'COBALT' | undefined,  // faction overrides color
  isAlly: false,    // allied to player (charmed)
  holdsKey: false,  // drops key on death
  // ... type-specific fields
}
```

### Enemy types
| type | symbol | notes |
|------|--------|-------|
| NORMAL | e | basic melee |
| ORC | G | Golem Orc — orc-shaped golem; higher HP/ATK, knockback charge; tutorial on floor 12 |
| LAYER | L | avoids holes (STAIRS); places blocks while fleeing |
| BREAKER | W | destroys walls; skips faction combat unless opp is last survivor |
| GOLD | $ | rare, high gold drop (floor 15+) |
| BOMBER | X | explodes on death; drops 1G |
| CRAZY_G | G (purple) | fast, high HP=player.hp, 200+floor×10G drop |
| MIMIC | > | disguises as stairs |
| FAIRY_MIMIC | * | disguises as fairy |
| TURRET | T | fires lasers in fixed direction; stationary |
| HOPPER_TURRET | T (orange) | turret that hops perpendicular to its laser |
| SPAWNER | [E] | purple block that periodically spawns minions |
| BLAZE | B | fire-elemental, leaves LAVA on move |
| FROST | F | ice-elemental, leaves ICE on move |
| DRAGON | D | boss at 100F |
| SNAKE | S | poison, multi-segment (head+body) |
| KING | ♛ | 101F+ rare (0.1%); buffs all enemies while alive; on death all enemies panic-flee; trophy counted on kill |
| PAUPER_SHADE | @ | Ghost of an adventurer who died penniless and cannot cross to the afterlife. Wanders dungeons attacking others to steal gold. Red flickering @; excluded from carrying key. Internal tracking: `movingMadmen` / `_madmanBFS` (names unchanged). |
| KEY_RUNNER | K (red) | carries key and flees; special AI |
| WISP_ENEMY | w | wisp-controlled enemy |
| SUMMONER | Σ | summons minions, floor 88 boss |
| HEALER | H | heals same-faction allies; avoids enemies; 2-turn cooldown |

### Faction system
- `faction: 'CRIMSON'` → rendered green (`#4ade80`)
- `faction: 'COBALT'`  → rendered purple (`#a855f7`)
- Faction enemies of opposing factions fight each other
- Enemies **without** a faction render in their default red/white color
- On faction floors, always assign a faction to ALL enemies (see Floor 33 pattern)

### Enemy AI loop order (inside `enemyTurn()`)
Order of branching per enemy — earlier branches pre-empt later ones (search comments in file to locate each block):
1. `e.sleeping` → skip turn entirely
2. **HEALER slow check** (`_slowSkip`) → HEALER acts every 2nd turn only
3. **3% universal random action** → 1-step random 4-dir move, skips normal AI (excludes TURRET/HOPPER_TURRET/SPAWNER/DRAGON/KING/CORE/MIMIC/FAIRY_MIMIC/SNAKE)
4. **Faction victory cluster** (`oppAlive === false`) → surviving faction roams in a pack (never freezes)
5. **Faction combat AI** (`e.faction && !e.isAlly && !BREAKER && !HEALER`) — but BREAKER & HEALER join when opposing faction has exactly 1 survivor (last-stand rule)
6. **HEALER special AI** → heal adjacent same-faction allies, flee threats, never step adjacent to a threat
7. **Normal AI** (chase player, TURRET fire, etc.)

### Common enemy fields (add to any enemy object)
| field | purpose |
|-------|---------|
| `flashUntil` | white flash on hit (ms timestamp) |
| `healGlowUntil` | soft green glow for 2.5s when healed |
| `stunTurns` | skip turn while > 0 |
| `_slowSkip` | HEALER-specific alternating turn skip |
| `_chaseLastDist`, `_chaseStuck` | pursuit stalemate detection in faction combat |
| `_fleeLastDx/Dy` | prevent flee oscillation |
| `faction` | `'CRIMSON' \| 'COBALT' \| undefined` |
| `isAlly` | charmed, treats player as ally |
| `holdsKey` | drops key on death |
| `family*` (familyId, homeX, homeY, breedTimer) | deep-floor family groups |

---

## Floor System

### Fixed stages list (all stages with a specific layout / mechanic)
Defined in `script.js` as the `FIXED_STAGES` array: `grep -n "^const FIXED_STAGES"` で位置を確認。
- `FIXED_STAGE_FLOORS` = array of floor numbers (derived)
- `FIXED_WIND_SUPPRESS_FLOORS` = subset where the random-wind roll (3% on floor≥10) is suppressed

**When adding a new fixed stage:** add a `{ floor: N, title: '...', suppressWind: true? }` entry to `FIXED_STAGES` — that auto-registers it in the TITLE → FIXED STAGE select menu AND controls wind suppression.

### 固定フロアへの移動方法
```
grep -n "FLOOR N:"  script.js   # N に数字を入れる
```
主要フロアは専用関数に抽出済み：
```
grep -n "^function _initFloor"  script.js
```

### Wind floors
Set inside `initMap()` after dungeon generation:
```js
isWindFloor = true;
windTimer = 4;  // starts from turn 1
```
Wind pushes the player downward each turn. Floors 7, 25, 33 are guaranteed wind.
Random wind chance starts at floor 10 (`floorLevel >= 10`).

### Fixed floor patterns (inside `initMap()`)
Each fixed floor has `if (floorLevel === N) { ... return; }` that builds the entire map
and returns early, skipping random generation.

| Floor | Type | Notes |
|-------|------|-------|
| 1–11 | Tutorial/Early | 各フロア固有チュートリアル設計 |
| 13 | Scroll walls | walls scroll right→left every turn; protected row y=3; crushed at x=1 = death |
| 15–30 | Mid-game fixed | 各種ギミック固有設計 |
| 35 | Ice | fixed ice stage |
| 40 | Special | special layout |
| 50 | Turret Corridor | 高耐久タレット + 100体の敵（`_initFloor50()`） |
| 66 | Faction | faction stage |
| 75 | Special | special layout |
| 78 | Faction | faction stage (player disguise) |
| 80 | Special | special layout |
| 88 | Boss | SUMMONER fight（`_initFloor88()`） |
| 99 | Icicle Cavern | 敵なし・洞窟壁 |
| 100 | Boss | DRAGON + DungeonCore（`_initFloor100()`） |

### Adding a new fixed floor — checklist
1. Add an entry to `FIXED_STAGES` array (`{ floor: N, title: '...', suppressWind: true }` if no random wind should roll)
2. Inside `initMap()`, add `// ----- FLOOR N: TITLE -----` マーカーを先頭に付けて `if (floorLevel === N) { ... return; }` ブロックを追加
3. Build map with `map[y][x] = SYMBOLS.FLOOR` etc., place enemies in `enemies` array
4. If faction floor: assign `.faction` to every enemy
5. If wind floor: set `isWindFloor = true; windTimer = 4;` before `return`
6. 大規模フロア（100行以上）なら `function _initFloorN() {}` に抽出して initMap から呼び出す

### Adding post-processing to a random floor (like floor 33)
```js
if (floorLevel === N) {
  // runs after normal random gen
  enemies.forEach(e => { if (!e.faction) e.faction = e.x < midX ? 'CRIMSON' : 'COBALT'; });
  // add extra enemies...
}
```

---

## Player Object
```js
player = {
  x, y,
  hp, maxHp,        // current / max HP
  level, exp, nextExp,
  stamina,          // 0-100; depletes on sprinting, -5 on being hit
  hasKey,           // carries the floor key
  gold,
  rings: [null, null],   // equipped ring IDs (2 slots)
  inventory: [],    // item objects
  attack, defense,
  // flags: isStealth, isInfiniteStamina, isShielded, ...
}
```

## Rings (RINGS array)
Each ring: `{ id, name, nameJa, desc, descJa, cost, symbol, color }`
Ring effects are applied in `handleAction`, `enemyTurn`, `handleEnemyDeath`, etc.
Check with `hasRing('RING_ID')`.
二重装備効果の説明文: `grep -n "RING_DOUBLED_DESC"` で参照。

---

## Key Functions Reference

行番号はファイル編集のたびにズレるため、以下の grep コマンドで常に正確な行を取得してください。

| Function | grep コマンド | Purpose |
|----------|-------------|---------|
| `initMap()` | `grep -n "^function initMap"` | Generates entire floor (call at floor transition) |
| `handleAction(dx, dy)` | `grep -n "^async function handleAction"` | Processes one player turn (async) |
| `enemyTurn()` | `grep -n "^async function enemyTurn"` | Processes all enemy actions (async) — see AI loop order above |
| `handleEnemyDeath` | `grep -n "^async function handleEnemyDeath"` | Death, drops, exp, rings (async) |
| `scheduleEnemyFall` | `grep -n "^function scheduleEnemyFall"` | Triggers enemy hole-fall (async-safe) |
| `draw(now)` | `grep -n "^function draw"` | Renders one frame |
| `drawStatusScreen()` | `grep -n "^function drawStatusScreen"` | ステータス画面描画（3ページ） |
| `updateUI()` | `grep -n "^function updateUI"` | HUD更新（HP/スタミナ/フロア/装備） |
| `addLog(msg)` | `grep -n "^function addLog"` | Appends line to the message log (left-bottom panel) |
| `spawnFloatingText` | `grep -n "^function spawnFloatingText"` | Shows floating UI text. Supports `rise`/`font` when pushed directly to `damageTexts` |
| `gainExp(amount)` | `grep -n "^function gainExp"` | Adds EXP and handles level-up |
| `canEnemyMove` | `grep -n "^function canEnemyMove"` | Checks if tile is walkable for enemy |
| `isRealHole(x, y)` | `grep -n "^function isRealHole"` | True if tile is a real STAIRS (not MIMIC) |
| `isWallAt(x, y)` | `grep -n "^function isWallAt"` | True if tile blocks movement |
| `enemyGroundBFS` | `grep -n "^function enemyGroundBFS"` | Returns first step toward target |
| `saveGame()` | `grep -n "^function saveGame"` | localStorage save |
| `loadGame()` | `grep -n "^function loadGame"` | localStorage load |
| `performWarpTeleport` | `grep -n "^async function performWarpTeleport"` | WARP_PAD teleport (player) |
| `applyEnemyWarpPad` | `grep -n "^async function applyEnemyWarpPad"` | WARP_PAD teleport (enemy) |
| `triggerGameOver` | `grep -n "^async function triggerGameOver"` | Game over sequence |
| `applyLaserDamage` | `grep -n "^async function applyLaserDamage"` | レーザーダメージ適用（毎ターン） |
| `buildEscapeRoomMap` | `grep -n "^function buildEscapeRoomMap"` | エスケープルームマップ生成（2×5グリッド） |
| `enterEscapeRoom` | `grep -n "^async function enterEscapeRoom"` | エスケープルーム入室シーケンス |
| `tryPlaceBlock` | `grep -n "^function tryPlaceBlock"` | ブロック設置処理（TERRAIN_RING含む） |
| `_applySummonTypeInit` | `grep -n "^function _applySummonTypeInit"` | 召喚敵の初期化（TERRAIN_RING×2） |
| `_initFloor50` | `grep -n "^function _initFloor50"` | 50F タレット回廊生成 |
| `_initFloor88` | `grep -n "^function _initFloor88"` | 88F SUMMONER ボス生成 |
| `_initFloor100` | `grep -n "^function _initFloor100"` | 100F DRAGON ボス生成 |

**特定の敵AIブロックを探す場合:**
`grep -n "// ===== AI: TYPE_NAME"` で各敵のAIブロック先頭に飛べます（enemyTurn内にマーカーあり）。

---

## ENEMY_DEFS — 敵ベーススタッツ参照テーブル

`grep -n "^const ENEMY_DEFS"` で定義箇所へ。

ランダムフロアでのメインスポーン cascade（`initMap()` 内）はこのテーブルを参照する。
各エントリは `(f) => ({ hp, maxHp, expValue })` の形式でフロアレベル `f` を受け取る。

**固定フロアの特殊スポーン**（ボス戦など）はこのテーブルを使わず直接記述のまま — 意図的に異なるステータスを持つため。

---

## Audio

### Synthesized SFX (no files needed)
```js
SOUNDS.BANG()           // impact
SOUNDS.DEFEAT()         // enemy dies
SOUNDS.LEVEL_UP()       // level up fanfare
SOUNDS.HEAL()           // bright ascending — reserved for Heal Tome
SOUNDS.HEAL_SOFT()      // gentle short sine — HEALER enemy heals
SOUNDS.TERRAIN_RESET()  // soft healing chime — Terrain Ring resets tile to FLOOR
// ... see SOUNDS object: grep -n "SECTION: SOUND EFFECTS"
```
Add new sounds by adding a method to the `SOUNDS` object using `audioCtx` oscillators. Helpers: `playSound(freq,type,duration,vol)`, `playMelody([{f,d},...])`.

### BGM
MP3 files listed in `BGM_TRACKS` array. Plays randomly with fade-out.
Boss BGM: `playBossBGM(src)`.

---

## Debug Shortcuts
```
http://localhost:9000/?debug=2   → trigger ending 2
http://localhost:9000/?debug=1   → trigger ending 1
F8  → ending 1 (in-game key)
F9  → ending 2 (in-game key)
↑↑↓↓ on title screen → secret test menu (floor select)
```
```js
// In browser console:
localStorage.setItem('deep_unlocked', '1')       // unlock Deep mode
localStorage.setItem('king_kill_count', '3')     // KINGトロフィー数をセット（テスト用）
```

## localStorage Keys
| Key | Value |
|-----|-------|
| `minimal_rogue_save` | full save JSON（`kingKillCount` を含む） |
| `floor100_story_seen` | "1" if 100F story shown |
| `deep_unlocked` | "1" if first ending cleared |
| `minimal_rogue_deaths` | death count (number) |
| `king_kill_count` | KING撃破数（minimal_rogue_save にも含まれる二重保存） |

---

## Common Pitfalls

- **`handleEnemyDeath` is async** — always `await` it if ordering matters
- **`canEnemyMove` does NOT block STAIRS** — enemies can walk onto holes; use `isRealHole` separately if needed
- **Faction floors must color ALL enemies** — any enemy without `.faction` renders red (default)
- **`FIXED_STAGES` array** — always add new fixed floors here to suppress random wind AND expose them in the title-menu FIXED STAGE select
- **`isWindFloor` must be set before `return`** in fixed floor blocks, or after random gen in post-processing
- **`spawnFloatingText` duration** — default 400ms; use 1200–1800 for important messages
- **`CRAZY_G` is always purple** — the pulsing purple effect is hardcoded; don't set `.faction` on it
- **HEALER edge cases** — if you add a new enemy-vs-enemy AI branch, add `&& e.type !== 'HEALER'` to preserve HEALER's pacifist AI (except for the "last opposing survivor" override). Same for BREAKER (keeps it wandering). See `enemyTurn()` comment markers.
- **3% random-action roll** — every non-static enemy takes a random 1-step move on 3% of its turns. If you write an AI that depends on turn-by-turn continuity (chained state), remember it may be preempted.
- **After editing script.js** — validate with: `node --check script.js` (catches syntax errors before reload)
- **新しい固定フロアブロック** — 先頭に `// ----- FLOOR N: TITLE -----` マーカーを付けること（grep ナビゲーション用）
- **マルチスクリーンの後処理ループ** — 必ず `if (!screenGrid.active[sy][sx]) continue;` を入れること。非アクティブ画面の `maps[sy][sx]` は null でクラッシュする

---

## Design Memos — Non-obvious Decisions

This section records design intent that is NOT derivable from reading the code alone.
Always consult this before modifying the systems listed here.

---

### Queen AI — Two Separate Contexts

The Queen faction (QUEEN_ALLY group) behaves differently depending on the floor type.
**Never conflate the two when modifying Queen AI.**

| Context | Floor | Enemy faction | Queen's enemy | Purge trigger |
|---------|-------|---------------|---------------|---------------|
| Normal floor | Random / non-faction | `'QUEEN_ALLY'` | **Player** | Opposing faction count ≤ 3 (player-HP-based condition) |
| Faction floor | 78F (and similar) | `'CRIMSON'` or `'COBALT'` | **Opposing faction** | Opposing faction count ≤ 3 |

- On **faction floors**, players are **completely ignored** until all opposing faction enemies are dead.
  This is enforced by the `_factionIgnorePlayer` flag (computed per-enemy per-turn in `enemyTurn()`).
- `_factionIgnorePlayer` is true when: `e.faction` is set AND `e.faction !== 'QUEEN_ALLY'` AND opposing faction enemies still alive.
- After all opposing faction enemies die → `_factionIgnorePlayer` becomes false → normal player-attack AI resumes.

**`_factionIgnorePlayer` must be checked at every player-targeting branch** in `enemyTurn()`. If you add a new player-attack code path, add `&& !_factionIgnorePlayer` (or `if (_factionIgnorePlayer) continue;`) to it.

---

### Purge Mode (粛清モード) — Queen Faction

When the opposing side drops to ≤ 3 survivors, all QUEEN_ALLY/same-faction members enter **purge mode** and converge on a single `purgeTarget`.

Key state variables (per-turn, computed inside `enemyTurn()`):
- `purgeTarget` — the single enemy being hunted (type varies by floor context)
- `purgeTarget._lastMoveAxis` — `'X'` or `'Y'`: the axis the target moved on last turn
- `_fpSorted` — all pursuers sorted by distance to purgeTarget (ascending)
- `_isTopThree` — true if this enemy is among the 3 closest to purgeTarget

**Movement rules in purge mode:**
1. **Top-3 pursuers** — wall-hugging priority: approach the nearest wall first (Phase 1), then advance along the wall toward the target (Phase 2). Never leave wall contact while a better wall-adjacent cell exists.
2. **Non-top-3 pursuers** — axis-switching: if target last moved on Y-axis → pursuer moves on X-axis toward target, and vice versa. Prevents column-formation chasing. When pursuer is on same row/col as target (cross-axis distance = 0), randomize direction to avoid deadlock.
3. **Ally-blocking fallback** — if BFS next step is occupied by ally, sidestep to an adjacent free cell rather than stopping.

---

### 78F — Faction Disguise Floor

- Player is disguised as an ORC (`'G'`). Enemies ignore player initially (design intent: player watches faction war unfold).
- Two factions: CRIMSON (left side) and COBALT (right side).
- All enemies on 78F must have `.faction` assigned; any enemy without faction renders red (bug).
- ORC-type enemies on 78F have the **hole-push tactic** (see below).

---

### ORC (G) Hole-Push Tactic

ORC enemies (on faction floors) try to push opposing enemies into STAIRS (holes).

Key variables computed per ORC turn:
- `gNearHole` — nearest STAIRS tile (Manhattan distance) to the ORC
- `_gOnHoleAxis(oe)` — returns true if enemy `oe` shares the same row OR column as both the ORC and `gNearHole`
- `gIgnoreWH` — true when NORMAL enemies exist as targets (ORC skips BREAKER/HEALER unless they are on the hole axis)
- `gAdjNonG` — adjacent opposing enemies (immediate attack candidates)
- `gNearEnemy` — nearest opposing enemy (chase candidate)

**Critical rule:** `gNearHole` must be computed **before** `gAdjNonG` and `gNearEnemy` loops, because `_gOnHoleAxis` depends on it.

When `gIgnoreWH` is true, BREAKER and HEALER are normally skipped as targets — **except** when `_gOnHoleAxis(oe)` is true, in which case they ARE targeted (to push them into the hole).

---

### `_factionIgnorePlayer` — Placement Rule

This flag is computed once per enemy per turn, just before the ORC AI block in `enemyTurn()`.
It must appear **before** any AI block that could target the player. Current guarded locations (9 total):
1. ORC attack-player check
2. NORMAL faction attack-player check
3. Main faction-war fallthrough (`if (friendlyPlayer || _factionIgnorePlayer) continue;`)
4–9. Additional player-detection branches inside normal AI

If you add any new "enemy attacks player" code path, always add the `_factionIgnorePlayer` guard.

---

### Turn Sequencing & `isProcessing` Flag

`isProcessing` is a **re-entrance guard**, not just a UI lock. It is set at the start of every `handleAction()` call and cleared only after `enemyTurn()`, `windGustSlide()`, and all async sequences finish. Input arriving while `isProcessing = true` is **discarded** (not queued). This means rapid key-presses during enemy animations are silently dropped.

**Fragility warning:** `isProcessing = false` appears at ~50 locations. Any early return path that forgets to clear it leaves the player permanently frozen. Always ensure every exit path (error, early return, `await` chain) clears the flag.

---

### Save / Load System — What Is and Isn't Saved

`saveGame()` saves **floor-start player state only**. Map, enemies, and items on the floor are **never serialized**.

- **Saved:** level, exp, hp/maxHp, stamina, sword/armor/tome counts, gold, ring IDs, tutorial flags, `kingKillCount`
- **NOT saved:** `player.hasKey`, active status effects (isSpeeding, isShielded, etc.), inventory items, enemy positions
- On floor transition: `saveGame()` is called → safe checkpoint
- On death: only `gold` is surgically zeroed in localStorage (not a full save). Mid-floor pickups since the last floor transition are **lost**.

`loadGame()` restores saved fields, then calls `initMap()` to regenerate the floor from scratch. There is no mid-floor save.

---

### Death Flow

`triggerGameOver()` is an async state machine:
1. Player HP = 0, gold zeroed in `localStorage` **immediately** (before animation)
2. `gameState = 'GAMEOVER_SEQ'` → 12-blink animation → red overlay → `gameState = 'GAMEOVER'`
3. **No recovery path.** Once `GAMEOVER`, only title-screen navigation exits.

Death count is incremented to `localStorage.minimal_rogue_deaths` at the moment of death.

---

### Wind Mechanic — Discrete, Not Continuous

Wind is **per-turn**, not per-frame. `windTimer` increments each turn in `updateUI()`. When `windTimer >= 5`, `windGustSlide()` triggers:
1. Pre-calculates all final positions (player + all non-immune enemies) in one pass
2. Animates movement simultaneously (35ms per tile)
3. Stops at walls; can kill by landing on STAIRS (floor advances) or pushing player to bottom edge

Enemies with `immuneToWind = true` are skipped entirely. Adding a new enemy that should be wind-immune: set `e.immuneToWind = true` at spawn.

---

### Floor-Specific Non-Obvious Rules

| Floor | Key constraint |
|-------|---------------|
| 13 | Scroll walls advance left every turn via `advanceScrollWalls()` (called in `windGustSlide()`). Player at `x=1` with a wall at `x=2` → **instant death**. Protected row `y=3` has no walls. |
| 40 | WISP units are NOT bound to their adjacent wall blocks. If the wall is destroyed, the wisp continues circling empty space. |
| 75 | WISP_SPAWNER has `immuneToWind = true`. Maze generated by "stick method" (棒倒し法) with safeguards around start corners and exit. |
| 80 | All enemies/items spawn in **1×1 cells surrounded by walls** (`findTrappedCell80()`). BREAKER enemies must wall-break to escape — this asymmetric escaping IS the mechanic. |

---

### Rendering Z-Order (draw() layer stack)

Back → front in `draw()`:
1. Map tiles (walls, floors, terrain, items, merchant)
2. Placed blocks
3. Bombs
4. WEAVER trails
5. Enemies (faction colors override: CRIMSON→green, COBALT→purple; KING glow on all non-KING alive)
6. Turret lasers
7. MIASMA corpses
8. **KEY** — rendered AFTER enemies so it floats visually above them (z-order hack)
9. Wisps
10. Bomb/flame projectiles
11. **Player** (facing flip via `ctx.scale(-1,1)`; held item drawn above player)
12. Wind overlay
13. **Floating text / damage numbers** — always on top

---

### Floating Text — Two Pathways

`spawnFloatingText(x, y, text, color, duration)` pushes to `damageTexts` **without** `rise`.

For rising animation (floats upward while fading), push **directly** to `damageTexts`:
```js
damageTexts.push({ x, y, text, color, duration: 1100, t: 0, rise: true });
```
`rise: true` causes `riseOffset = elapsed * TILE_SIZE * 1.4` during render. `spawnFloatingText()` cannot set `rise`.

---

### KING — 深層レアエンカウンター

- 101F以降、固定ステージ外で 0.1%（1000階に1体期待値）の確率でスポーン
- 静止型（`_staticTypes` に登録済み）— 自ら動かない
- **オーラ①**: 生存中は全非KING敵へのダメージが -2（"GUARD!" 表示）
- **オーラ②**: 生存中は全敵の攻撃力 +3（金色ダメージ数字）
- **死亡時**: 全敵が PANIC! フラグで逃走、下降メロディ、画面シェイク
- **トロフィー**: 撃破ごとに `kingKillCount++`、`saveGame()` 即呼び出し
  - エスケープルーム内の撃破はカウント対象外（`!isInEscapeRoom` チェック）
  - ステータス画面 Page 1 の KILLS 欄直下に ♛ を表示

---

### SPAWNER — No Minion Cap

SPAWNER spawns one NORMAL enemy every 10 turns with **no cap on total minion count**. Minions accumulate indefinitely until killed. Adding a cap: check `enemies.filter(oe => oe.summonedBy === e && oe.hp > 0).length` before spawning.

---

### SNAKE — Body Is a Queue

SNAKE body is a segment array `e.body[]`. On each move, each segment shifts to the previous segment's position (queue shift). `canEnemyMove()` does **NOT** block SNAKE body segments — they are transparent to movement collision. Only attack detection checks body tiles. A SNAKE can technically move into its own body; collisions are resolved at the attack layer.

---

### DRAGON variants — `_bossDragon` フラグで区別すること ⚠️

`type: 'DRAGON'` は複数の全く異なる敵に共有されている。コードを書く際は必ず以下の表で区別すること。

| type | 識別方法 | 出現場所 | 備考 |
|------|---------|---------|------|
| `DRAGON` (ラスボス) | `e._bossDragon === true` | 100F のみ | 死亡→エンディング、HP50%フェーズ、炎耐性、FEAR発生 |
| `MINI_DRAGON` | `e.type === 'MINI_DRAGON'` | 深層101F+ / 奇妙な部屋 / クレジット面 | 完全に独立した別タイプ。3ターン移動＋ジャンプ攻撃。白=静止、青=敵を攻撃、赤=プレイヤー追跡 |

**`DRAGON` type は 100F ラスボスのみ。非ボスのDキャラは全て `MINI_DRAGON` を使うこと。**
**ボス専用処理（死亡演出・炎耐性・HP50%フェーズ・FEAR・メインAI）は必ず `e._bossDragon` チェックを使うこと。**

### DRAGON (100F) — Global Phase Flag

DRAGON's phase-2 transition is guarded by the **global** `dragonHalfPhaseTriggered` boolean, not a per-enemy flag. This means only one phase transition occurs per 100F entry regardless of how many DRAGONs exist. Phase 2 (at ≤50% HP): fire cooldown 3→2 turns, floor-melt chance 25%, spawn cooldown 6→4 turns.

DRAGON movement is NOT pathfinding — it uses a simple attract/repulse toward the player with hardcoded bounds (left=5, right=COLS-15, top=`baseY`, bottom=`baseY+5`). It crushes ALL entities it overlaps (allies: 9999 damage = instant death; enemies: 50 damage).

---

### Charm / Ally System

Charm (CHARM_TOME) sets `e.isAlly = true` on enemies within 5 tiles (Manhattan). Immune to charm: DRAGON, TURRET, HOPPER_TURRET, SUMMONER, CRAZY_G, and any enemy with `.faction` set.

Charmed enemies travel between floors via `travelingAllies[]` array. Charmed MIMIC breaks disguise immediately. Charmed KEY_RUNNER drops its key on charming (not on death).

Allies attack other enemies, never the player or each other. Allied SUMMONER does not summon.

---

### BLAZE / FROST — Tile Writes Are Permanent Map Geometry

BLAZE writes LAVA at its new position each move; FROST writes ICE. These are permanent `map[][]` changes. All entities (player, enemies, items) are equally affected. LAVA deals ~8 HP to player on contact. ICE causes sliding.

ICE sliding is implemented as a per-frame loop (`while slideSteps < 100`), not a single atomic move. The slide can land the player in a hole (floor-advance) or on an enemy (triggers combat mid-slide).

---

### TURRET / HOPPER_TURRET — Direction Is Immutable

TURRET's laser direction (`e.dir`: 0=up, 1=right, 2=down, 3=left) is set randomly at spawn and **never changes**. HOPPER_TURRET's direction is set at map-gen time based on wall proximity, and it moves only on the perpendicular axis.

**Terrain Ring summoned TURRET**: direction is set to face AWAY from player at the moment of summoning (`_applySummonTypeInit` 内で計算）。

---

### Faction Victory Cluster — Roams Indefinitely

After all opposing faction enemies die (`oppAlive === false`), surviving faction members roam as a pack around their centroid. This state has **no time limit and no cleanup** — the faction remains active and will turn hostile if the player comes within 10 tiles. This is intentional: the player must eventually face the winning faction.

---

## How to add a new enemy type (quick recipe)

1. **Pick a single-letter symbol** (avoid clashing with SYMBOLS or existing enemy letters)
2. **`ENEMY_DEFS` に追加** — ランダムスポーンさせる場合はベーススタッツを登録（`grep -n "^const ENEMY_DEFS"`）
3. **Spawn logic** — decide where it appears:
   - Fixed floor only → `if (floorLevel === N)` ブロック内に直接記述（固定スタッツ）
   - Random floors → `ENEMY_DEFS` を使って main spawn cascade の `else if` に追加
4. **Rendering** — add an `else if (e.type === 'FOO')` branch in the enemy draw code (around line 12240+), set `eColor` and `eChar`
5. **AI** — add logic inside `enemyTurn()`. Respect the AI loop order: place the branch where it fits (before or after faction/HEALER blocks as appropriate), always end with `continue;` to skip normal AI
6. **Drops / death** — extend `handleEnemyDeath()` if needed
7. **Exclusions (if static)** — add to the `_staticTypes` array in the 3%-random-action block so it doesn't wander
8. Update this file's enemy table
