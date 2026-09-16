const test = require("node:test");
const assert = require("node:assert/strict");
const keys = require("../lib/hybrid-keys.js");

test("no forbidden key is in the hybrid key set", () => {
  for (const forbidden of keys.FORBIDDEN_KEYS) {
    assert.equal(
      keys.HYBRID_KEYS.includes(forbidden.code),
      false,
      `${forbidden.name} (0x${forbidden.code.toString(16)}) must stay out: ${forbidden.reason}`
    );
  }
});

test("F is forbidden — it flips the cat in Bongo Cat (issue #7)", () => {
  const f = keys.FORBIDDEN_KEYS.find((k) => k.code === 0x46);
  assert.ok(f, "0x46 must be listed in FORBIDDEN_KEYS");
  assert.equal(keys.HYBRID_KEYS.includes(0x46), false);
  assert.equal(keys.HYBRID_ALPHA_KEYS.includes(0x46), false);
});

test("R is still forbidden — it rotates the cat (issue #2)", () => {
  assert.ok(keys.FORBIDDEN_KEYS.some((k) => k.code === 0x52));
  assert.equal(keys.HYBRID_KEYS.includes(0x52), false);
});

test("F1-F12 are still forbidden", () => {
  for (let code = 0x70; code <= 0x7b; code++) {
    assert.ok(
      keys.FORBIDDEN_KEYS.some((k) => k.code === code),
      `0x${code.toString(16)} must be listed in FORBIDDEN_KEYS`
    );
    assert.equal(keys.HYBRID_KEYS.includes(code), false);
  }
});

test("the hybrid key set has no duplicates", () => {
  assert.equal(new Set(keys.HYBRID_KEYS).size, keys.HYBRID_KEYS.length);
});

test("every key fits in the byte keybd_event/SendInput expects", () => {
  for (const code of keys.HYBRID_KEYS) {
    assert.ok(
      Number.isInteger(code) && code > 0x00 && code <= 0xff,
      `0x${code.toString(16)} is not a valid virtual-key byte`
    );
  }
});

test("alpha keys are exactly the A-Z entries of the hybrid set", () => {
  assert.deepEqual(
    keys.HYBRID_ALPHA_KEYS,
    keys.HYBRID_KEYS.filter((k) => k >= 0x41 && k <= 0x5a)
  );
  // A-Z minus R and F
  assert.equal(keys.HYBRID_ALPHA_KEYS.length, 24);
});

// ── Configurable key exclusions (renderer toggle grid) ──

test("ALL_KEYS is HYBRID_KEYS plus F and R (86 total, no duplicates)", () => {
  assert.equal(keys.ALL_KEYS.length, 86);
  assert.deepEqual(
    [...keys.ALL_KEYS].sort((a, b) => a - b),
    [...keys.HYBRID_KEYS, 0x46, 0x52].sort((a, b) => a - b)
  );
  assert.equal(new Set(keys.ALL_KEYS).size, keys.ALL_KEYS.length);
});

test("ALL_KEYS never contains F1-F12", () => {
  for (let code = 0x70; code <= 0x7b; code++) {
    assert.equal(
      keys.ALL_KEYS.includes(code),
      false,
      `0x${code.toString(16)} leaked into ALL_KEYS`
    );
  }
});

test("DEFAULT_EXCLUDED_CODES is exactly [F, R]", () => {
  assert.deepEqual(keys.DEFAULT_EXCLUDED_CODES, [0x46, 0x52]);
});

test("effectiveKeys with no argument reproduces the default key set", () => {
  const result = keys.effectiveKeys();
  assert.deepEqual(result.keys, keys.HYBRID_KEYS);
  assert.deepEqual(result.alphaKeys, keys.HYBRID_ALPHA_KEYS);
});

test("effectiveKeys falls back to the default exclusion for null and non-arrays", () => {
  assert.deepEqual(keys.effectiveKeys(null).keys, keys.HYBRID_KEYS);
  assert.deepEqual(keys.effectiveKeys("0x52").keys, keys.HYBRID_KEYS);
});

test("effectiveKeys([F, R]) equals the current shipped behavior", () => {
  const result = keys.effectiveKeys([0x46, 0x52]);
  assert.deepEqual(result.keys, keys.HYBRID_KEYS);
  assert.deepEqual(result.alphaKeys, keys.HYBRID_ALPHA_KEYS);
});

test("effectiveKeys([]) presses everything: 86 keys, 26 alpha, F and R included", () => {
  const result = keys.effectiveKeys([]);
  assert.equal(result.keys.length, 86);
  assert.equal(result.alphaKeys.length, 26);
  assert.ok(result.keys.includes(0x46), "F must be pressable when not excluded");
  assert.ok(result.keys.includes(0x52), "R must be pressable when not excluded");
});

test("effectiveKeys removes an excluded letter from both key sets", () => {
  const result = keys.effectiveKeys([0x51]);
  assert.equal(result.keys.includes(0x51), false);
  assert.equal(result.alphaKeys.includes(0x51), false);
  // Baseline [] = all 26 letters; excluding Q leaves 25 (F/R stay included).
  assert.equal(result.alphaKeys.length, keys.effectiveKeys([]).alphaKeys.length - 1);
});

test("effectiveKeys drops garbage entries — string codes never coerce", () => {
  const result = keys.effectiveKeys(["0x46", "70", 1.5, null, undefined, {}, true]);
  assert.equal(result.keys.length, 86);
  assert.ok(result.keys.includes(0x46), "string '0x46' must not be coerced into excluding F");
});

test("effectiveKeys ignores out-of-universe codes — F1-F12 can never appear", () => {
  const result = keys.effectiveKeys([0x70, 0x7b, 0x05, 0x5b, 0x100]);
  for (let code = 0x70; code <= 0x7b; code++) {
    assert.equal(result.keys.includes(code), false);
  }
  assert.equal(result.keys.length, 86);
});

test("effectiveKeys collapses duplicate exclusions", () => {
  assert.deepEqual(keys.effectiveKeys([0x51, 0x51, 81]).keys, keys.effectiveKeys([0x51]).keys);
});

test("effectiveKeys returns fresh arrays and never mutates its sources", () => {
  const allSnapshot = [...keys.ALL_KEYS];
  const hybridSnapshot = [...keys.HYBRID_KEYS];
  const result = keys.effectiveKeys(["junk"]);
  assert.notEqual(result.keys, keys.ALL_KEYS);
  result.keys.push(0x70);
  assert.equal(keys.ALL_KEYS.includes(0x70), false);
  assert.deepEqual(keys.ALL_KEYS, allSnapshot);
  assert.deepEqual(keys.HYBRID_KEYS, hybridSnapshot);
});

test("KEY_NAMES is a bijection over ALL_KEYS with unique names", () => {
  const named = Object.keys(keys.KEY_NAMES)
    .map(Number)
    .sort((a, b) => a - b);
  const expected = [...keys.ALL_KEYS].sort((a, b) => a - b);
  assert.deepEqual(named, expected);
  const values = Object.values(keys.KEY_NAMES);
  assert.equal(new Set(values).size, values.length);
  const lowered = values.map((v) => v.toLowerCase());
  assert.equal(new Set(lowered).size, lowered.length);
  for (const value of values) {
    assert.equal(typeof value, "string");
    assert.ok(value.length > 0);
  }
});
