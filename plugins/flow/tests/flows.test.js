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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var board_1 = require("../hooks/board");
var flow_1 = require("../hooks/flow");
var quickbar_1 = require("../hooks/quickbar");
var trail_1 = require("../hooks/trail");
var stops = function (task) { return (0, flow_1.rail)(task).map(function (stop) { return "".concat(stop.state, " ").concat(stop.stage); }); };
var run = function (task) {
    var skills = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        skills[_i - 1] = arguments[_i];
    }
    return skills.reduce(function (moved, skill, at) { return (0, flow_1.recordSkill)(moved, skill, at + 1); }, task);
};
(0, testing_1.test)('each flow draws its own rail from new', function () {
    (0, testing_1.expect)(stops((0, flow_1.createTask)('Retry checkout', 0, { flow: 'oneshot' }))).toEqual(['ahead implement', 'ahead pr', 'ahead retro']);
    (0, testing_1.expect)(stops((0, flow_1.createTask)('Retry checkout', 0, { flow: 'grill' }))).toEqual([
        'ahead grill-with-docs',
        'ahead implement',
        'ahead pr',
        'ahead retro',
    ]);
    (0, testing_1.expect)(stops((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }))).toEqual([
        'ahead grill-with-docs',
        'ahead to-spec',
        'ahead to-tickets',
        'ahead implement-spec',
        'ahead pr',
        'ahead retro',
    ]);
    (0, testing_1.expect)(stops((0, flow_1.createTask)('Retry checkout', 0, { flow: 'freeform' }))).toEqual([]);
    (0, testing_1.expect)(stops((0, flow_1.createTask)('Retry checkout', 0, { flow: 'oneshot', openPr: false }))).toEqual(['ahead implement', 'ahead retro']);
});
(0, testing_1.test)('a new task guesses its flow from where it joins, and the guess can be overridden', function () {
    (0, testing_1.expect)((0, flow_1.createTask)('#123', 0).flow).toBe('oneshot');
    (0, testing_1.expect)((0, flow_1.createTask)('checkout crashes on submit', 0).flow).toBe('oneshot');
    (0, testing_1.expect)((0, flow_1.createTask)('greenfield billing service', 0).flow).toBe('wayfind');
    (0, testing_1.expect)((0, flow_1.createTask)('retry failed checkout payments', 0).flow).toBe('grill');
    (0, testing_1.expect)((0, flow_1.createTask)('retry failed checkout payments', 0, { flow: 'spec' }).flow).toBe('spec');
    var named = (0, flow_1.createTask)('a long description\nwith more lines', 0, { title: 'Retry payments', model: 'opus', effort: 'high' });
    (0, testing_1.expect)(named).toMatchObject({ title: 'Retry payments', slug: 'retry-payments', model: 'opus', effort: 'high', openPr: true, worktree: 'never' });
});
(0, testing_1.test)('an on-ramp replaces the first stage: a bug starts at diagnosing-bugs', function () {
    var broken = (0, flow_1.createTask)('checkout crashes on submit', 0);
    (0, testing_1.expect)(stops(broken)).toEqual(['ahead diagnosing-bugs', 'ahead pr', 'ahead retro']);
    (0, testing_1.expect)((0, flow_1.nextAction)(broken)).toMatchObject({ command: 'diagnosing-bugs', args: 'checkout crashes on submit' });
    (0, testing_1.expect)((0, flow_1.recordSkill)(broken, 'diagnosing-bugs', 1).phase).toBe('diagnosing-bugs');
});
(0, testing_1.test)('Wayfind charts a map, clears it one ticket per session, then specs the way', function () {
    var foggy = (0, flow_1.createTask)('greenfield billing service', 0);
    (0, testing_1.expect)(foggy.flow).toBe('wayfind');
    (0, testing_1.expect)(stops(foggy)).toEqual([
        'ahead wayfinder',
        'ahead wayfinder-clear',
        'ahead to-spec',
        'ahead to-tickets',
        'ahead implement-spec',
        'ahead pr',
        'ahead retro',
    ]);
    (0, testing_1.expect)((0, flow_1.nextAction)(foggy)).toEqual({
        command: 'wayfinder',
        args: 'greenfield billing service',
        why: 'start here: name the destination and chart the decisions ahead',
    });
    var charted = (0, flow_1.recordArtifact)((0, flow_1.recordSkill)(foggy, 'wayfinder', 1), 'https://github.com/o/r/issues/40', 2);
    var ticketed = (0, flow_1.recordArtifact)(charted, 'https://github.com/o/r/issues/41', 3);
    (0, testing_1.expect)(ticketed.phase).toBe('wayfinder');
    (0, testing_1.expect)((0, flow_1.nextAction)(ticketed)).toEqual({
        command: 'wayfinder',
        args: 'https://github.com/o/r/issues/40',
        why: 'clear the map: one frontier ticket per session, /clear between',
    });
    var clearing = (0, flow_1.recordSkill)(ticketed, 'mattpocock-skills:wayfinder', 4);
    (0, testing_1.expect)(clearing.phase).toBe('wayfinder-clear');
    (0, testing_1.expect)(stops(clearing).slice(0, 3)).toEqual(['done wayfinder', 'now wayfinder-clear', 'ahead to-spec']);
    (0, testing_1.expect)((0, flow_1.nextAction)(clearing)).toEqual({
        command: 'wayfinder',
        args: 'https://github.com/o/r/issues/40',
        why: 'next frontier ticket, one per session; /clear between',
        alt: { command: 'to-spec', label: 'Map is clear' },
    });
    (0, testing_1.expect)((0, flow_1.recordSkill)(clearing, 'wayfinder', 5).phase).toBe('wayfinder-clear');
    (0, testing_1.expect)((0, flow_1.editGate)(clearing, 'src/pay.ts')).toContain('/flow allow');
    var specing = (0, flow_1.recordSkill)(clearing, 'to-spec', 6);
    (0, testing_1.expect)((0, flow_1.nextAction)(specing)).toMatchObject({ command: 'to-spec' });
    (0, testing_1.expect)((0, flow_1.nextAction)((0, flow_1.recordArtifact)(specing, '.scratch/greenfield-billing-service/spec.md', 7))).toMatchObject({ command: 'flow', args: 'approve' });
});
(0, testing_1.test)('a local map file is the map, wherever it was written', function () {
    var charted = (0, flow_1.recordSkill)((0, flow_1.createTask)('greenfield billing service', 0), 'wayfinder', 1);
    var local = (0, flow_1.recordArtifact)((0, flow_1.recordArtifact)(charted, '.scratch/greenfield-billing-service/issues/01-pick-a-ledger.md', 2), '.scratch/greenfield-billing-service/map.md', 3);
    (0, testing_1.expect)((0, flow_1.nextAction)(local).args).toBe('.scratch/greenfield-billing-service/map.md');
    (0, testing_1.expect)((0, flow_1.nextAction)(charted)).toEqual({ command: 'wayfinder', why: 'clear the map: pass its link; one frontier ticket per session' });
});
(0, testing_1.test)('/wayfinder on a smaller workflow grows it into Wayfind', function () {
    var grown = (0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'wayfinder', 1);
    (0, testing_1.expect)(grown.flow).toBe('wayfind');
    (0, testing_1.expect)(grown.phase).toBe('wayfinder');
    (0, testing_1.expect)((0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0, { flow: 'freeform' }), 'wayfinder', 1).flow).toBe('freeform');
});
(0, testing_1.test)('the next action walks each flow to done', function () {
    var oneshot = (0, flow_1.createTask)('#12 fix the retry', 0);
    (0, testing_1.expect)((0, flow_1.nextAction)(oneshot).command).toBe('implement');
    (0, testing_1.expect)((0, flow_1.nextAction)(run(oneshot, 'implement'))).toEqual({ command: 'pr', why: 'open the pull request, with the checks as evidence' });
    (0, testing_1.expect)((0, flow_1.nextAction)(run(oneshot, 'implement', 'pr')).command).toBe('retro');
    (0, testing_1.expect)((0, flow_1.nextAction)(run(oneshot, 'implement', 'pr', 'retro'))).toEqual({ command: 'flow', args: 'done', why: 'close the task' });
    var grill = (0, flow_1.createTask)('Retry checkout', 0);
    (0, testing_1.expect)((0, flow_1.nextAction)(grill)).toEqual({ command: 'grill-with-docs', args: 'Retry checkout', why: 'start here: sharpen the idea and settle the decisions first' });
    (0, testing_1.expect)((0, flow_1.nextAction)(run(grill, 'grill-with-docs')).command).toBe('implement');
    var spec = (0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' });
    (0, testing_1.expect)((0, flow_1.nextAction)(run(spec, 'grill-with-docs')).command).toBe('to-spec');
    var specced = run(spec, 'grill-with-docs', 'to-spec');
    (0, testing_1.expect)((0, flow_1.nextAction)(specced)).toEqual({ command: 'to-spec', why: 'no spec recorded yet: write it, or /flow approve <path or link>' });
    var written = (0, flow_1.recordArtifact)(specced, '.scratch/retry-checkout/spec.md', 8);
    (0, testing_1.expect)((0, flow_1.nextAction)(written)).toEqual({ command: 'flow', args: 'approve', why: 'read .scratch/retry-checkout/spec.md, then approve the spec' });
    (0, testing_1.expect)((0, flow_1.nextAction)((0, flow_1.approvePhase)(written, 9)).command).toBe('to-tickets');
});
(0, testing_1.test)('the ticket the task was made from is what the first stage reads', function () {
    var task = (0, flow_1.recordArtifact)((0, flow_1.createTask)('Retry checkout', 0, { flow: 'oneshot' }), '.scratch/retry-checkout/ticket.md', 1);
    (0, testing_1.expect)((0, flow_1.nextAction)(task)).toMatchObject({ command: 'implement', args: '.scratch/retry-checkout/ticket.md' });
});
(0, testing_1.test)('implement and implement-spec fill the same slot, so either one moves a spec task on', function () {
    var spec = run((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 'to-spec', 'to-tickets', 'implement');
    (0, testing_1.expect)(stops(spec)).toEqual([
        'done grill-with-docs',
        'done to-spec',
        'done to-tickets',
        'now implement',
        'ahead pr',
        'ahead retro',
    ]);
});
(0, testing_1.test)('a stage outside the flow grows it into the smallest flow that has it, and says so', function () {
    var oneshot = (0, flow_1.createTask)('#12 fix the retry', 0);
    var grilled = run(oneshot, 'grill-with-docs');
    (0, testing_1.expect)(grilled.flow).toBe('grill');
    (0, testing_1.expect)(grilled.log.at(-1)).toMatchObject({ kind: 'flow', detail: 'grill' });
    var specced = run(grilled, 'to-spec');
    (0, testing_1.expect)(specced.flow).toBe('spec');
    (0, testing_1.expect)((0, flow_1.nextAction)((0, flow_1.approvePhase)(specced, 9)).command).toBe('to-tickets');
    (0, testing_1.expect)(run((0, flow_1.createTask)('Retry checkout', 0, { flow: 'freeform' }), 'to-spec').flow).toBe('freeform');
    (0, testing_1.expect)(run((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'implement').flow).toBe('spec');
});
(0, testing_1.test)('freeform records every stage, holds no edits and hands the choice to ask-matt', function () {
    var free = (0, flow_1.createTask)('Retry checkout', 0, { flow: 'freeform' });
    (0, testing_1.expect)((0, flow_1.nextAction)(free)).toEqual({ command: 'ask-matt', args: 'Retry checkout', why: 'freeform: ask-matt picks the skill' });
    var grilled = run(free, 'grill-with-docs');
    (0, testing_1.expect)(stops(grilled)).toEqual(['now grill-with-docs']);
    (0, testing_1.expect)((0, flow_1.editGate)(grilled, 'src/pay.ts')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.nextAction)(grilled)).toEqual({ command: 'flow', args: 'done', why: 'freeform: run any skill, then close the task' });
});
(0, testing_1.test)('status: working while a turn runs, waiting at a gate with something to read, ready otherwise, done once closed', function () {
    var specced = run((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 'to-spec');
    (0, testing_1.expect)((0, flow_1.statusOf)(specced, true)).toBe('working');
    // Nothing recorded yet: there is nothing to wait on.
    (0, testing_1.expect)((0, flow_1.statusOf)(specced, false)).toBe('ready');
    var written = (0, flow_1.recordArtifact)(specced, '.scratch/retry-checkout/spec.md', 8);
    (0, testing_1.expect)((0, flow_1.statusOf)(written, false)).toBe('waiting');
    (0, testing_1.expect)((0, flow_1.statusOf)((0, flow_1.approvePhase)(written, 9), false)).toBe('ready');
    (0, testing_1.expect)((0, flow_1.statusOf)(__assign(__assign({}, specced), { closedAt: 10 }), true)).toBe('done');
});
(0, testing_1.test)('a task file written before flows keeps the rail it had', function () {
    var _a = run((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs'), _ = _a.flow, __ = _a.openPr, ___ = _a.worktree, old = __rest(_a, ["flow", "openPr", "worktree"]);
    var read = (0, flow_1.withDefaults)(old);
    (0, testing_1.expect)(read).toMatchObject({ flow: 'spec', openPr: true, worktree: 'never' });
    (0, testing_1.expect)((0, flow_1.withDefaults)(__assign(__assign({}, old), { entry: 'foggy' })).flow).toBe('wayfind');
    (0, testing_1.expect)((0, flow_1.nextAction)(read).command).toBe('to-spec');
});
(0, testing_1.test)('/flow new takes flags for the flow, the start, the PR, the worktree, the model and the effort', function () {
    (0, testing_1.expect)((0, flow_1.parseNew)('--workflow spec --model opus --effort high retry payments')).toEqual({
        text: 'retry payments',
        options: { flow: 'spec', model: 'opus', effort: 'high' },
    });
    (0, testing_1.expect)((0, flow_1.parseNew)('--start=broken --no-pr --worktree the thing')).toEqual({
        text: 'the thing',
        options: { start: 'broken', openPr: false, worktree: 'now' },
    });
    (0, testing_1.expect)((0, flow_1.parseNew)('just words')).toEqual({ text: 'just words', options: {} });
    (0, testing_1.expect)((0, flow_1.parseNew)('--workflow nope x').bad).toBe('--workflow nope');
    (0, testing_1.expect)((0, flow_1.parseNew)('--effort extreme x').bad).toBe('--effort extreme');
    (0, testing_1.expect)((0, flow_1.parseNew)('--start nope x').bad).toBe('--start nope');
});
(0, testing_1.test)('a clearing map offers its way out: the quickbar, the reminder and the board all know it', function () {
    var charted = (0, flow_1.recordArtifact)((0, flow_1.recordSkill)((0, flow_1.createTask)('greenfield billing service', 0), 'wayfinder', 1), 'https://github.com/o/r/issues/40', 2);
    var clearing = (0, flow_1.recordSkill)(charted, 'wayfinder', 3);
    (0, testing_1.expect)((0, quickbar_1.defaults)(clearing, 10, 50)).toEqual([
        { text: '/to-spec', label: 'Map is clear', mode: 'send' },
        { text: '/clear', mode: 'send' },
    ]);
    (0, testing_1.expect)((0, quickbar_1.defaults)(clearing, 80, 50).filter(function (one) { return one.text === '/clear'; })).toHaveLength(1);
    (0, testing_1.expect)((0, trail_1.reminder)(charted, 'wayfinder', 'feature')).toContain('Charting the map: label it wayfinder:map');
    (0, testing_1.expect)((0, trail_1.reminder)(clearing, 'wayfinder', 'feature')).toContain('Clearing the map https://github.com/o/r/issues/40: resolve one frontier ticket');
    var rail = (0, board_1.boardDoc)(clearing, 'shop', 9).rail;
    (0, testing_1.expect)(rail.find(function (stop) { return stop.stage === 'wayfinder-clear'; })).toMatchObject({ label: 'Clear the map', command: 'wayfinder', state: 'now' });
});
(0, testing_1.test)('the model reads each stage in words with the command that runs it', function () {
    var clearing = (0, flow_1.recordSkill)((0, flow_1.recordSkill)((0, flow_1.createTask)('greenfield billing service', 0), 'wayfinder', 1), 'wayfinder', 2);
    (0, testing_1.expect)((0, trail_1.reminder)(clearing, 'wayfinder', 'feature')).toContain('Workflow Wayfind: Chart the map (/wayfinder) -> Clear the map (/wayfinder) -> Write the spec (/to-spec)');
});
