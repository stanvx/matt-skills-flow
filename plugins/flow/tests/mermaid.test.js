"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var flow_1 = require("../hooks/flow");
var mermaid_1 = require("../hooks/mermaid");
var trail_1 = require("../hooks/trail");
var TICKETS = ['flowchart LR', '  T1[01 schema] --> T2[02 api]', '  T1 --> T3[03 ui]', '  T2 --> T4[04 e2e]', '  T3 --> T4'].join('\n');
(0, testing_1.test)('a mermaid fence becomes a text fence of its art, with every node label', function () {
    var drawn = (0, mermaid_1.withDiagrams)(['# Tickets', '', '```mermaid', TICKETS, '```', '', 'Build 01 first.'].join('\n'), 120);
    (0, testing_1.expect)(drawn).not.toContain('```mermaid');
    (0, testing_1.expect)(drawn).toContain('```text');
    for (var _i = 0, _a = ['01 schema', '02 api', '03 ui', '04 e2e']; _i < _a.length; _i++) {
        var label = _a[_i];
        (0, testing_1.expect)(drawn).toContain(label);
    }
    (0, testing_1.expect)(drawn).toContain('Build 01 first.');
    (0, testing_1.expect)(drawn).toContain('►');
});
(0, testing_1.test)('a file with Windows line endings still draws its diagrams', function () {
    var drawn = (0, mermaid_1.withDiagrams)(['```mermaid', 'flowchart LR', '  A[start] --> B[end]', '```'].join('\r\n'), 120);
    (0, testing_1.expect)(drawn).toContain('```text');
    (0, testing_1.expect)(drawn).toContain('start');
});
(0, testing_1.test)('an indented fence keeps its indent, and a diagram that will not draw keeps its fence', function () {
    var indented = (0, mermaid_1.withDiagrams)(['- the flow:', '', '  ```mermaid', '  flowchart LR', '    A[start] --> B[end]', '  ```'].join('\n'), 120);
    (0, testing_1.expect)(indented).toContain('  ```text');
    (0, testing_1.expect)(indented.split('\n').filter(function (line) { return line.includes('start'); }).every(function (line) { return line.startsWith('  '); })).toBe(true);
    var broken = ['```mermaid', 'pie title nope', '  "a" : 1', '```'].join('\n');
    (0, testing_1.expect)((0, mermaid_1.withDiagrams)(broken, 120)).toBe(broken);
});
(0, testing_1.test)('a flowchart too wide for the pane turns the other way, and says so when neither fits', function () {
    var _a, _b, _c;
    (0, testing_1.expect)((0, mermaid_1.flipped)('flowchart LR\n  A --> B')).toBe('flowchart TD\n  A --> B');
    (0, testing_1.expect)((0, mermaid_1.flipped)('graph TD\n  A --> B')).toBe('graph LR\n  A --> B');
    (0, testing_1.expect)((0, mermaid_1.flipped)('sequenceDiagram\n  A->>B: hi')).toBeUndefined();
    var long = 'flowchart LR\n  A[grill-with-docs] --> B[to-spec] --> C[to-tickets] --> D[implement-spec] --> E[pr] --> F[retro]';
    var wide = (0, mermaid_1.drawDiagram)(long, 200);
    (0, testing_1.expect)(wide === null || wide === void 0 ? void 0 : wide.isWide).toBe(false);
    var narrow = (0, mermaid_1.drawDiagram)(long, 40);
    (0, testing_1.expect)(narrow).toBeDefined();
    (0, testing_1.expect)((0, mermaid_1.widthOf)((_a = narrow === null || narrow === void 0 ? void 0 : narrow.art) !== null && _a !== void 0 ? _a : '')).toBeLessThan((0, mermaid_1.widthOf)((_b = wide === null || wide === void 0 ? void 0 : wide.art) !== null && _b !== void 0 ? _b : ''));
    (0, testing_1.expect)((_c = (0, mermaid_1.drawDiagram)(long, 5)) === null || _c === void 0 ? void 0 : _c.isWide).toBe(true);
    (0, testing_1.expect)((0, mermaid_1.withDiagrams)(['```mermaid', long, '```'].join('\n'), 5)).toContain('Wider than the pane');
});
(0, testing_1.test)('to-spec and to-tickets ask for a diagram; other stages do not', function () {
    var task = (0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 1);
    (0, testing_1.expect)((0, trail_1.reminder)(task, 'to-spec', 'feature')).toContain('mermaid diagram of the key flow');
    (0, testing_1.expect)((0, trail_1.reminder)(task, 'to-tickets', 'feature')).toContain('mermaid flowchart LR of the tickets');
    (0, testing_1.expect)((0, trail_1.reminder)(task, 'implement', 'feature')).not.toContain('mermaid');
});
