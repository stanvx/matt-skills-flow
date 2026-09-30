"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripSvg = exports.COLUMN_PX = exports.stripAlt = exports.compactChips = exports.stripChips = exports.stripText = exports.stripRows = exports.segmentText = exports.segmentsOf = exports.LEGEND = exports.GATE = exports.GLYPH = void 0;
var flows_1 = require("./flows");
var status_1 = require("./status");
exports.GLYPH = { done: '✓', now: '●', ahead: '○' };
exports.GATE = '◆';
exports.LEGEND = '✓ done  ● now  ○ ahead  ◆ you approve';
var ARROW = ' ─► ';
var TURN = '─► ';
var LOOK = {
    done: { color: 'green' },
    now: { color: status_1.ACCENT, bold: true },
    ahead: { dimColor: true },
};
var GATE_LOOK = {
    waiting: { color: 'yellow', bold: true },
    approved: { color: 'green' },
    ahead: { dimColor: true },
};
/** The rail as strip segments, each stage named in words. */
var segmentsOf = function (rail) {
    return rail.map(function (stop) { return (__assign({ stage: stop.stage, label: (0, flows_1.stageLabel)(stop.stage), state: stop.state }, (stop.gate === undefined ? {} : { gate: stop.gate }))); });
};
exports.segmentsOf = segmentsOf;
/** One segment as text: its glyph, its label and the gate mark after it. */
var segmentText = function (one) { return "".concat(exports.GLYPH[one.state], " ").concat(one.label).concat(one.gate === undefined ? '' : " ".concat(exports.GATE)); };
exports.segmentText = segmentText;
var cells = function (text) { return __spreadArray([], text, true).length; };
var rowText = function (row, isFirst) { return "".concat(isFirst ? '' : TURN).concat(row.map(exports.segmentText).join(ARROW)); };
/** The segments in rows no wider than `columns`, breaking only between stages. */
var stripRows = function (segments, columns) {
    return segments.reduce(function (rows, one) {
        var last = rows.at(-1);
        var fits = last !== undefined && cells(rowText(__spreadArray(__spreadArray([], last, true), [one], false), rows.length === 1)) <= columns;
        return last !== undefined && fits ? __spreadArray(__spreadArray([], rows.slice(0, -1), true), [__spreadArray(__spreadArray([], last, true), [one], false)], false) : __spreadArray(__spreadArray([], rows, true), [[one]], false);
    }, []);
};
exports.stripRows = stripRows;
/** The strip as plain lines; a row after the first starts with an arrow. */
var stripText = function (segments, columns) {
    return (0, exports.stripRows)(segments, columns).map(function (row, at) { return rowText(row, at === 0); });
};
exports.stripText = stripText;
/** The strip as rows of chips for the terminal. */
var stripChips = function (segments, columns) {
    return (0, exports.stripRows)(segments, columns).map(function (row, at) {
        return row.flatMap(function (one, index) { return __spreadArray(__spreadArray(__spreadArray([], (index > 0 ? [{ text: ARROW, dimColor: true }] : at > 0 ? [{ text: TURN, dimColor: true }] : []), true), [
            __assign({ text: "".concat(exports.GLYPH[one.state], " ").concat(one.label) }, LOOK[one.state])
        ], false), (one.gate === undefined ? [] : [__assign({ text: " ".concat(exports.GATE) }, GATE_LOOK[one.gate])]), true); });
    });
};
exports.stripChips = stripChips;
/** The band's glyph run, `✓─●◆─○◆─○`, as chips. */
var compactChips = function (segments) {
    return segments.flatMap(function (one, index) { return __spreadArray(__spreadArray(__spreadArray([], (index === 0 ? [] : [{ text: '─', dimColor: true }]), true), [
        __assign({ text: exports.GLYPH[one.state] }, LOOK[one.state])
    ], false), (one.gate === undefined ? [] : [__assign({ text: exports.GATE }, GATE_LOOK[one.gate])]), true); });
};
exports.compactChips = compactChips;
/** What the strip says, for a reader that cannot see it. */
var stripAlt = function (segments) {
    return "Stages: ".concat(segments
        .map(function (one) {
        var gate = one.gate === 'waiting' ? ', waiting for approval' : one.gate === 'approved' ? ', approved' : '';
        return "".concat(one.label, " (").concat(one.state === 'now' ? 'current' : one.state).concat(gate, ")");
    })
        .join(', '));
};
exports.stripAlt = stripAlt;
var escape = function (text) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
// ponytail: widths from a per-character estimate at 12px; a measured font if labels ever clip.
var CHAR = 7;
var PAD = 10;
var HEIGHT = 28;
var GAP = 28;
var TOP = 4;
var ROW_GAP = 10;
var STYLE = [
    '.box{fill:none;stroke:#a1a1aa}.box.now{fill:#0891b2;stroke:#0891b2}.box.ahead{stroke-dasharray:3 3}',
    '.label{font:12px system-ui,-apple-system,sans-serif;fill:#3f3f46}.label.done{fill:#15803d}.label.now{fill:#fff;font-weight:600}.label.ahead{fill:#a1a1aa}',
    '.arrow{stroke:#a1a1aa;fill:#a1a1aa}.gate-waiting{fill:#ca8a04}.gate-approved{fill:#16a34a}.gate-ahead{fill:#d4d4d8;stroke:#a1a1aa}',
    '@media (prefers-color-scheme:dark){.box{stroke:#52525b}.label{fill:#e4e4e7}.label.done{fill:#4ade80}.label.ahead{fill:#71717a}',
    '.arrow{stroke:#52525b;fill:#52525b}.gate-waiting{fill:#facc15}.gate-approved{fill:#4ade80}.gate-ahead{fill:#27272a;stroke:#52525b}}',
].join('');
/** Pixels per terminal column, to turn a pane's `bodyColumns` into an SVG width. */
exports.COLUMN_PX = 8;
/**
 * The strip as a standalone SVG: boxes, arrows and gate diamonds, colored
 * for the viewer's light or dark scheme, wrapped into rows no wider than
 * `maxWidth` so a narrow pane never shrinks the text.
 */
var stripSvg = function (segments, maxWidth) {
    if (maxWidth === void 0) { maxWidth = Number.POSITIVE_INFINITY; }
    var widths = segments.map(function (one) { return cells("".concat(exports.GLYPH[one.state], " ").concat(one.label)) * CHAR + PAD * 2; });
    // Each row holds segment indexes; a row after the first starts after an arrow.
    var rows = widths.reduce(function (packed, width, index) {
        var last = packed.at(-1);
        var used = last === undefined ? 0 : (packed.length > 1 ? GAP : 0) + last.reduce(function (sum, at) { var _a; return sum + ((_a = widths[at]) !== null && _a !== void 0 ? _a : 0) + GAP; }, 0);
        return last !== undefined && used + width + 16 <= maxWidth ? __spreadArray(__spreadArray([], packed.slice(0, -1), true), [__spreadArray(__spreadArray([], last, true), [index], false)], false) : __spreadArray(__spreadArray([], packed, true), [[index]], false);
    }, []);
    var arrowAt = function (from, middle) {
        return "<path class=\"arrow\" d=\"M".concat(from + 3, " ").concat(middle, "H").concat(from + GAP - 7, "\"/><path class=\"arrow\" d=\"M").concat(from + GAP - 8, " ").concat(middle - 3.5, "L").concat(from + GAP - 3, " ").concat(middle, "L").concat(from + GAP - 8, " ").concat(middle + 3.5, "Z\"/>");
    };
    var drawn = rows.map(function (row, line) {
        var _a, _b, _c;
        var top = TOP + line * (HEIGHT + ROW_GAP);
        var middle = top + HEIGHT / 2;
        var start = line === 0 ? 0 : GAP;
        var lefts = row.map(function (_index, at) { return start + row.slice(0, at).reduce(function (sum, index) { var _a; return sum + ((_a = widths[index]) !== null && _a !== void 0 ? _a : 0) + GAP; }, 0); });
        var parts = row.map(function (index, at) {
            var _a, _b;
            var one = segments[index];
            var left = (_a = lefts[at]) !== null && _a !== void 0 ? _a : 0;
            var width = (_b = widths[index]) !== null && _b !== void 0 ? _b : 0;
            if (one === undefined) {
                return '';
            }
            var right = left + width;
            var box = "<rect class=\"box ".concat(one.state, "\" x=\"").concat(left + 0.5, "\" y=\"").concat(top + 0.5, "\" width=\"").concat(width - 1, "\" height=\"").concat(HEIGHT - 1, "\" rx=\"7\"/>");
            var label = "<text class=\"label ".concat(one.state, "\" x=\"").concat(left + width / 2, "\" y=\"").concat(middle + 4, "\" text-anchor=\"middle\">").concat(escape("".concat(exports.GLYPH[one.state], " ").concat(one.label)), "</text>");
            var isRowEnd = at === row.length - 1;
            var arrow = isRowEnd ? '' : arrowAt(right, middle);
            var x = isRowEnd ? right + 9 : right + GAP / 2 - 2;
            var gate = one.gate === undefined
                ? ''
                : "<path class=\"gate-".concat(one.gate, "\" d=\"M").concat(x, " ").concat(middle - 5.5, "L").concat(x + 5.5, " ").concat(middle, "L").concat(x, " ").concat(middle + 5.5, "L").concat(x - 5.5, " ").concat(middle, "Z\"/>");
            return "".concat(box).concat(label).concat(arrow).concat(gate);
        });
        return { html: "".concat(line === 0 ? '' : arrowAt(0, middle)).concat(parts.join('')), right: ((_a = lefts.at(-1)) !== null && _a !== void 0 ? _a : 0) + ((_c = widths[(_b = row.at(-1)) !== null && _b !== void 0 ? _b : 0]) !== null && _c !== void 0 ? _c : 0) };
    });
    // Room for a gate diamond after a row's last box.
    var width = Math.ceil(Math.max.apply(Math, __spreadArray([0], drawn.map(function (one) { return one.right; }), false)) + 16);
    var height = TOP * 2 + rows.length * HEIGHT + (rows.length - 1) * ROW_GAP;
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(width, "\" height=\"").concat(height, "\" viewBox=\"0 0 ").concat(width, " ").concat(height, "\"><style>").concat(STYLE, "</style>").concat(drawn.map(function (one) { return one.html; }).join(''), "</svg>");
};
exports.stripSvg = stripSvg;
