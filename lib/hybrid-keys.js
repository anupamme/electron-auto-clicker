// The hybrid clicker key set, extracted so it can be unit tested without
// Electron. Loaded by main.js when it builds the PowerShell/C# payloads.

// Keys that must never be sent by the hybrid clicker: each one is bound to an
// action in Bongo Cat that the constant key spam would trigger. The test suite
// asserts none of them are in HYBRID_KEYS, so a future edit cannot bring one
// back unnoticed.
const FORBIDDEN_KEYS = [
  { code: 0x52, name: "R", reason: "rotates the cat in Bongo Cat (issue #2)" },
  { code: 0x46, name: "F", reason: "flips the cat horizontally in Bongo Cat (issue #7)" },
  // F1-F12 break the game outright.
  ...Array.from({ length: 12 }, (_, i) => ({
    code: 0x70 + i,
    name: `F${i + 1}`,
    reason: "breaks the game (Bongo Cat)",
  })),
];

// Single source of truth for the hybrid clicker key set.
// NEVER add a key listed in FORBIDDEN_KEYS above.
const HYBRID_KEYS = [
  0x25, 0x26, 0x27, 0x28, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0xbd, 0xbb,
  0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6d, 0x6e, 0x6f, 0x41,
  0x42, 0x43, 0x44, 0x45, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x53,
  0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0xba, 0xbf, 0xc0, 0xdb, 0xdc, 0xdd, 0xde, 0xbc, 0xbe,
  0x7c, 0x7d, 0x7e, 0x7f, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x20, 0x08, 0x2d, 0x2e,
  0x24, 0x23, 0x21, 0x22,
];

// Every key the hybrid clicker can EVER press: HYBRID_KEYS plus F (0x46) and
// R (0x52). F and R stay excluded by DEFAULT (Bongo Cat issues #2/#7) but the
// user may re-enable them via the renderer's toggle grid — their presence here
// is deliberate, do NOT "clean them up". F1-F12 (0x70-0x7B) are outside this
// universe, so nothing can ever re-enable them.
const ALL_KEYS = [...HYBRID_KEYS, 0x46, 0x52];

// Display names for the renderer's toggle grid — exactly one per ALL_KEYS
// entry (asserted by the test suite). OEM names follow the US keyboard layout;
// 0xC0 shows as Ё on the Russian layout.
const KEY_NAMES = {
  0x08: "Bksp",
  0x20: "Space",
  0x21: "PgUp",
  0x22: "PgDn",
  0x23: "End",
  0x24: "Home",
  0x25: "←",
  0x26: "↑",
  0x27: "→",
  0x28: "↓",
  0x2d: "Ins",
  0x2e: "Del",
  0x30: "0",
  0x31: "1",
  0x32: "2",
  0x33: "3",
  0x34: "4",
  0x35: "5",
  0x36: "6",
  0x37: "7",
  0x38: "8",
  0x39: "9",
  0x41: "A",
  0x42: "B",
  0x43: "C",
  0x44: "D",
  0x45: "E",
  0x46: "F",
  0x47: "G",
  0x48: "H",
  0x49: "I",
  0x4a: "J",
  0x4b: "K",
  0x4c: "L",
  0x4d: "M",
  0x4e: "N",
  0x4f: "O",
  0x50: "P",
  0x51: "Q",
  0x52: "R",
  0x53: "S",
  0x54: "T",
  0x55: "U",
  0x56: "V",
  0x57: "W",
  0x58: "X",
  0x59: "Y",
  0x5a: "Z",
  0x60: "Numpad0",
  0x61: "Numpad1",
  0x62: "Numpad2",
  0x63: "Numpad3",
  0x64: "Numpad4",
  0x65: "Numpad5",
  0x66: "Numpad6",
  0x67: "Numpad7",
  0x68: "Numpad8",
  0x69: "Numpad9",
  0x6a: "Num*",
  0x6b: "Num+",
  0x6d: "Num-",
  0x6e: "Num.",
  0x6f: "Num/",
  0x7c: "F13",
  0x7d: "F14",
  0x7e: "F15",
  0x7f: "F16",
  0x80: "F17",
  0x81: "F18",
  0x82: "F19",
  0x83: "F20",
  0x84: "F21",
  0x85: "F22",
  0x86: "F23",
  0x87: "F24",
  0xba: ";",
  0xbb: "=",
  0xbc: ",",
  0xbd: "-",
  0xbe: ".",
  0xbf: "/",
  0xc0: "Ё/`",
  0xdb: "[",
  0xdc: "\\",
  0xdd: "]",
  0xde: "'",
};

// Keys excluded by default: F and R (Bongo Cat issues #2/#7). The user can
// lift this via the toggle grid.
const DEFAULT_EXCLUDED_CODES = [0x46, 0x52];

// Resolve the effective hybrid key set from a list of excluded VK codes.
// - null/undefined/non-array input falls back to DEFAULT_EXCLUDED_CODES —
//   a missing IPC payload field must never silently re-enable F and R.
// - An explicit empty array means "press everything" (deliberate user opt-in).
// - Garbage entries (non-integers, out-of-byte-range codes) are dropped;
//   codes outside ALL_KEYS simply match nothing, so F1-F12 can never appear.
// Always returns fresh arrays; never mutates ALL_KEYS or HYBRID_KEYS.
function effectiveKeys(excluded) {
  if (!Array.isArray(excluded)) {
    excluded = DEFAULT_EXCLUDED_CODES;
  }
  const excludedSet = new Set(
    excluded.filter((code) => Number.isInteger(code) && code > 0x00 && code <= 0xff)
  );
  const keys = ALL_KEYS.filter((code) => !excludedSet.has(code));
  const alphaKeys = keys.filter((code) => code >= 0x41 && code <= 0x5a);
  return { keys, alphaKeys };
}

// Alpha keys (A-Z) used for the shift-combo batch — derived from HYBRID_KEYS so
// the two sets can never drift apart.
const HYBRID_ALPHA_KEYS = HYBRID_KEYS.filter((k) => k >= 0x41 && k <= 0x5a);

module.exports = {
  FORBIDDEN_KEYS,
  HYBRID_KEYS,
  HYBRID_ALPHA_KEYS,
  ALL_KEYS,
  KEY_NAMES,
  DEFAULT_EXCLUDED_CODES,
  effectiveKeys,
};
