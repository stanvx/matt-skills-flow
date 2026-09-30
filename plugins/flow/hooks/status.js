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
exports.WALKTHROUGH = exports.boardOrder = exports.fitsOneLine = exports.bandRows = exports.keyHints = exports.skillsRun = exports.subline = exports.badgeText = exports.stageText = exports.progress = exports.gateText = exports.glyph = exports.STATUS_BORDER = exports.STATUS_GLYPH = exports.FLOW_COLOR = exports.ACCENT = exports.statusLook = exports.commandLine = exports.BOARD = exports.RAIL = void 0;
var flow_1 = require("./flow");
exports.RAIL = 'flow';
exports.BOARD = 'flow-board';
/** The next command as a person types it: `/to-spec` or `/flow approve`. */
var commandLine = function (task) {
    var step = (0, flow_1.nextAction)(task);
    return ["/".concat(step.command), step.args].filter(Boolean).join(' ');
};
exports.commandLine = commandLine;
/** Working and Done recede, a wait for a person stands out, Ready is go. */
exports.statusLook = {
    working: { dimColor: true },
    waiting: { color: 'yellow', bold: true },
    ready: { color: 'green' },
    done: { dimColor: true },
};
/** The terminal's accent, for the stage the task is in. */
exports.ACCENT = 'cyan';
/** Each workflow's chip color, the board's hues. */
exports.FLOW_COLOR = {
    oneshot: '#5ad1e6',
    grill: '#f59e6b',
    spec: '#a78bfa',
    wayfind: '#6ee7a8',
    freeform: '#b4bccb',
};
exports.STATUS_GLYPH = { working: '…', waiting: '◆', ready: '●', done: '✓' };
/** The band's frame follows the status: a wait for a person is the one that stands out. */
exports.STATUS_BORDER = {
    working: { borderColor: 'gray', borderDimColor: true },
    waiting: { borderColor: 'yellow' },
    ready: { borderColor: 'green' },
    done: { borderColor: 'gray', borderDimColor: true },
};
exports.glyph = { done: '✓', now: '●', ahead: '○' };
var gateText = function (gate) {
    return gate === 'approved' ? 'approved' : gate === 'waiting' ? 'waiting for approval' : undefined;
};
exports.gateText = gateText;
/** Stages reached and stages in the rail; Freeform has none, so no progress. */
var progress = function (task) {
    if (task.flow === 'freeform') {
        return undefined;
    }
    var stops = (0, flow_1.rail)(task);
    return { at: stops.filter(function (stop) { return stop.state !== 'ahead'; }).length, of: stops.length };
};
exports.progress = progress;
/** `stage 2 of 6`, or `not started` before the first stage; undefined for Freeform. */
var stageText = function (task) {
    var found = (0, exports.progress)(task);
    return found === undefined ? undefined : found.at === 0 ? 'not started' : "stage ".concat(found.at, " of ").concat(found.of);
};
exports.stageText = stageText;
/** The workflow's chip text: `Spec 2/6`, or just `Freeform`. */
var badgeText = function (label, task) {
    var found = (0, exports.progress)(task);
    return found === undefined ? label : "".concat(label, " ").concat(found.at, "/").concat(found.of);
};
exports.badgeText = badgeText;
/** The pane's second line: where the task lives, how far it got, what it runs on. */
var subline = function (task) {
    return [
        ".scratch/".concat(task.slug),
        (0, exports.stageText)(task),
        task.model === undefined ? undefined : "model ".concat(task.model),
        task.effort === undefined ? undefined : "effort ".concat(task.effort),
    ]
        .filter(Boolean)
        .join(' · ');
};
exports.subline = subline;
/** Freeform has no rail: the skills that ran, latest last. */
var skillsRun = function (task) { return task.history.slice(-10).map(function (step) { return step.skill; }); };
exports.skillsRun = skillsRun;
/** The keys that work now, as the pane's one dim line. */
var keyHints = function (task) {
    var _a, _b;
    return [
        'n next',
        task.artifacts.length > 0 ? 'o artifact' : undefined,
        (0, flow_1.nextAction)(task).alt === undefined ? undefined : "m ".concat((_b = (_a = (0, flow_1.nextAction)(task).alt) === null || _a === void 0 ? void 0 : _a.label.toLowerCase()) !== null && _b !== void 0 ? _b : ''),
        (0, flow_1.editGate)(task, 'src') === undefined ? undefined : 'e allow edits',
        'b board',
        'ctrl+x tab focus',
        'esc back',
    ]
        .filter(Boolean)
        .join(' · ');
};
exports.keyHints = keyHints;
/** Rows the framed band needs: the frame, the header, the strip's rows (one for Freeform's note), the action row, and one for saved phrases or a wrapped action row. */
var bandRows = function (stripRows) { return 2 + 1 + Math.max(1, stripRows) + 1 + 1; };
exports.bandRows = bandRows;
/** Whether the button and its why share one line in `columns` cells. */
var fitsOneLine = function (columns, label, why) { return label.length + why.length + 6 <= columns; };
exports.fitsOneLine = fitsOneLine;
/** Board rows: open tasks first, closed ones last, each group in the order given. */
var boardOrder = function (tasks) { return __spreadArray(__spreadArray([], tasks.filter(function (task) { return task.closedAt === undefined; }), true), tasks.filter(function (task) { return task.closedAt !== undefined; }), true); };
exports.boardOrder = boardOrder;
/** What the empty board tells a new person to do. */
exports.WALKTHROUGH = [
    'Press New task (n) and describe the work.',
    'Pick a workflow: Grill for most things, Oneshot when the ticket says enough.',
    'Press 1 in an empty prompt to run each next step; approve gates when they wait.',
];
