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
var testing_1 = require("claude-code/testing");
var board_1 = require("../hooks/board");
var flow_1 = require("../hooks/flow");
var flows_1 = require("../hooks/flows");
var strip_1 = require("../hooks/strip");
var writing = function () {
    return (0, flow_1.recordSkill)((0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 1), 'to-spec', 2);
};
var specced = function () { return (0, flow_1.recordArtifact)(writing(), '.scratch/retry-checkout/spec.md', 3); };
(0, testing_1.test)('stages read in words, falling back to the skill name', function () {
    (0, testing_1.expect)((0, flows_1.stageLabel)('to-spec')).toBe('Write the spec');
    (0, testing_1.expect)((0, flows_1.stageLabel)('implement-spec')).toBe('Build the tickets');
    (0, testing_1.expect)((0, flows_1.stageLabel)('something-new')).toBe('something-new');
});
(0, testing_1.test)('the strip names each stage, marks where the task is and which gates wait', function () {
    var segments = (0, strip_1.segmentsOf)((0, board_1.railView)(specced()));
    (0, testing_1.expect)((0, strip_1.stripText)(segments, 400)).toEqual([
        '✓ Settle decisions ─► ● Write the spec ◆ ─► ○ Split into tickets ◆ ─► ○ Build the tickets ─► ○ Open the PR ─► ○ Look back',
    ]);
    (0, testing_1.expect)((0, strip_1.compactChips)(segments).map(function (chip) { return chip.text; }).join('')).toBe('✓─●◆─○◆─○─○─○');
    (0, testing_1.expect)((0, strip_1.compactChips)(segments).find(function (chip) { return chip.text === '◆'; })).toMatchObject({ color: 'yellow' });
    var approved = (0, strip_1.compactChips)((0, strip_1.segmentsOf)((0, board_1.railView)((0, flow_1.approvePhase)(specced(), 3))));
    (0, testing_1.expect)(approved.filter(function (chip) { return chip.text === '◆'; })[0]).toMatchObject({ color: 'green' });
    // Nothing recorded to read yet: the gate does not wait.
    (0, testing_1.expect)((0, strip_1.compactChips)((0, strip_1.segmentsOf)((0, board_1.railView)(writing()))).find(function (chip) { return chip.text === '◆'; })).toMatchObject({ dimColor: true });
});
(0, testing_1.test)('the strip wraps between stages to fit, continuing with an arrow', function () {
    var _a, _b;
    var lines = (0, strip_1.stripText)((0, strip_1.segmentsOf)((0, board_1.railView)(specced())), 44);
    (0, testing_1.expect)(lines.length).toBeGreaterThan(1);
    (0, testing_1.expect)(lines.every(function (line) { return __spreadArray([], line, true).length <= 44; })).toBe(true);
    (0, testing_1.expect)((_a = lines[1]) === null || _a === void 0 ? void 0 : _a.startsWith('─► ')).toBe(true);
    (0, testing_1.expect)(lines.join(' ')).toContain('Look back');
    var chips = (0, strip_1.stripChips)((0, strip_1.segmentsOf)((0, board_1.railView)(specced())), 44);
    (0, testing_1.expect)(chips).toHaveLength(lines.length);
    (0, testing_1.expect)(chips.map(function (row) { return row.map(function (chip) { return chip.text; }).join(''); })).toEqual(lines);
    (0, testing_1.expect)((_b = chips[0]) === null || _b === void 0 ? void 0 : _b.find(function (chip) { return chip.text === '● Write the spec'; })).toMatchObject({ color: 'cyan', bold: true });
});
(0, testing_1.test)('the SVG draws every stage, the current one filled, and says the same in words', function () {
    var segments = (0, strip_1.segmentsOf)((0, board_1.railView)(specced()));
    var svg = (0, strip_1.stripSvg)(segments);
    (0, testing_1.expect)(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    (0, testing_1.expect)(svg.length).toBeLessThan(131072);
    for (var _i = 0, segments_1 = segments; _i < segments_1.length; _i++) {
        var one = segments_1[_i];
        (0, testing_1.expect)(svg).toContain(one.label);
    }
    (0, testing_1.expect)(svg).toContain('class="box now"');
    (0, testing_1.expect)(svg).toContain('class="gate-waiting"');
    (0, testing_1.expect)(svg).toContain('prefers-color-scheme:dark');
    var wrapped = (0, strip_1.stripSvg)(segments, 400);
    var widthOf = function (markup) { var _a; return Number((_a = /width="(\d+)"/.exec(markup)) === null || _a === void 0 ? void 0 : _a[1]); };
    var heightOf = function (markup) { var _a; return Number((_a = /height="(\d+)"/.exec(markup)) === null || _a === void 0 ? void 0 : _a[1]); };
    (0, testing_1.expect)(widthOf(wrapped)).toBeLessThanOrEqual(400);
    (0, testing_1.expect)(heightOf(wrapped)).toBeGreaterThan(heightOf(svg));
    (0, testing_1.expect)(wrapped).toContain('Look back');
    (0, testing_1.expect)((0, strip_1.stripAlt)(segments)).toBe('Stages: Settle decisions (done), Write the spec (current, waiting for approval), Split into tickets (ahead), Build the tickets (ahead), Open the PR (ahead), Look back (ahead)');
});
