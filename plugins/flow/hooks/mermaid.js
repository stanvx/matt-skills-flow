"use strict";
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
exports.withDiagrams = exports.drawDiagram = exports.flipped = exports.widthOf = void 0;
// Mermaid diagrams in an artifact, drawn as text art for the artifact tab:
// each closed ```mermaid fence becomes a ```text fence of its art. Pure but
// for the render cache.
var mermaid_ascii_js_1 = require("./vendor/mermaid-ascii.js");
// A fence opened and closed at the same indent; the source keeps its lines.
var FENCE = /^([ \t]*)```mermaid[ \t]*\n([\s\S]*?)\n\1```[ \t]*$/gm;
var MAX_SOURCE = 12000;
// paddingY 0 garbles branching graphs; 1 with no inner padding stays compact and whole.
var OPTIONS = { colorMode: 'none', paddingX: 2, paddingY: 1, boxBorderPadding: 0 };
// ponytail: module cache, lost on a reload, which only costs a re-render.
var cache = new Map();
var render = function (source) {
    var _a;
    var hit = cache.get(source);
    if (hit !== undefined) {
        return hit;
    }
    var art = (function () {
        try {
            return (0, mermaid_ascii_js_1.renderMermaidAscii)(source, OPTIONS)
                .split('\n')
                .map(function (line) { return line.trimEnd(); })
                .join('\n')
                .replace(/^\n+|\n+$/g, '');
        }
        catch (_a) {
            return null;
        }
    })();
    cache.set(source, art === '' ? null : art);
    return (_a = cache.get(source)) !== null && _a !== void 0 ? _a : null;
};
/** The widest line of `art`, in characters. */
var widthOf = function (art) { return Math.max.apply(Math, __spreadArray([0], art.split('\n').map(function (line) { return __spreadArray([], line, true).length; }), false)); };
exports.widthOf = widthOf;
/** A flowchart's source turned the other way (LR and TD), or undefined for any other diagram. */
var flipped = function (source) {
    var found = /^(\s*(?:flowchart|graph)\s+)(LR|RL|TD|TB|BT)\b/.exec(source);
    if (found === null) {
        return undefined;
    }
    var turned = found[2] === 'LR' || found[2] === 'RL' ? 'TD' : 'LR';
    return "".concat(found[1]).concat(turned).concat(source.slice(found[0].length));
};
exports.flipped = flipped;
/**
 * The art for one diagram, turned where the other direction fits `columns`
 * better; `isWide` when neither fits. Undefined when it will not draw.
 */
var drawDiagram = function (source, columns) {
    if (source.length > MAX_SOURCE) {
        return undefined;
    }
    var art = render(source);
    if (art === null) {
        return undefined;
    }
    if ((0, exports.widthOf)(art) <= columns) {
        return { art: art, isWide: false };
    }
    var other = (0, exports.flipped)(source);
    var turned = other === undefined ? null : render(other);
    var best = turned !== null && (0, exports.widthOf)(turned) < (0, exports.widthOf)(art) ? turned : art;
    return { art: best, isWide: (0, exports.widthOf)(best) > columns };
};
exports.drawDiagram = drawDiagram;
/** Markdown with each mermaid fence drawn as text art; a diagram that will not draw keeps its fence. */
var withDiagrams = function (markdown, columns) {
    return markdown.replace(/\r\n?/g, '\n').replace(FENCE, function (fence, indent, body) {
        var source = body
            .split('\n')
            .map(function (line) { return (line.startsWith(indent) ? line.slice(indent.length) : line); })
            .join('\n');
        var drawn = (0, exports.drawDiagram)(source, columns);
        if (drawn === undefined) {
            return fence;
        }
        var art = drawn.art
            .split('\n')
            .map(function (line) { return "".concat(indent).concat(line); })
            .join('\n');
        return __spreadArray([
            "".concat(indent, "```text"),
            art,
            "".concat(indent, "```")
        ], (drawn.isWide ? ["".concat(indent, "_Wider than the pane: widen it, or open the file._")] : []), true).join('\n');
    });
};
exports.withDiagrams = withDiagrams;
