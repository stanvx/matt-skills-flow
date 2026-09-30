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
exports.statusOf = exports.nextAction = exports.rail = exports.editGate = exports.createdUrl = exports.scratchPointer = exports.inside = exports.allowPhase = exports.approvePhase = exports.isWaiting = exports.isAllowed = exports.gateArtifact = exports.isApproved = exports.recordEvent = exports.recordArtifact = exports.mapOf = exports.recordSkill = exports.isTracked = exports.isStage = exports.stagesOf = exports.withDefaults = exports.createTask = exports.parseNew = exports.isFlow = exports.slugify = exports.inferEntry = exports.skillName = exports.GATED = exports.PLANNING = exports.STEPS = exports.STAGES = void 0;
var flows_1 = require("./flows");
exports.STAGES = [
    'grill-with-docs',
    'wayfinder',
    'wayfinder-clear',
    'to-spec',
    'to-tickets',
    'implement',
    'implement-spec',
    'retro',
];
exports.STEPS = [
    'grilling',
    'domain-modeling',
    'prototype',
    'research',
    'tdd',
    'code-review',
    'pr',
    'wizard',
    'handoff',
    'diagnosing-bugs',
];
/** Phases that shape the work: code edits wait for /implement. */
exports.PLANNING = ['grill-with-docs', 'wayfinder', 'wayfinder-clear', 'to-spec', 'to-tickets'];
/** Phases whose artifact waits for a person's approval, and what it is called. */
exports.GATED = { 'to-spec': 'spec', 'to-tickets': 'tickets' };
var ENTRY_WORDS = {
    ticket: 'ticket',
    implement: 'ticket',
    idea: 'idea',
    grill: 'idea',
    broken: 'broken',
    diagnose: 'broken',
    foggy: 'foggy',
    wayfind: 'foggy',
    wayfinder: 'foggy',
};
/** `mattpocock-skills:to-spec` and `to-spec` are the same skill. */
var skillName = function (name) { return name.slice(name.lastIndexOf(':') + 1); };
exports.skillName = skillName;
// ponytail: keyword heuristic, `--start` overrides it; a $.model.complete
// classifier if the guesses keep missing.
var inferEntry = function (text) {
    if (/(^|\s)(#\d+|https?:\/\/\S+\/(issues|pull)\/\d+|[A-Z][A-Z0-9]+-\d+)(\s|$)/.test(text)) {
        return 'ticket';
    }
    if (/\b(bug|broken|crash(es|ing)?|failing|errors?|regression|flaky)\b/i.test(text)) {
        return 'broken';
    }
    if (/\b(greenfield|foggy|from scratch|rewrite)\b/i.test(text)) {
        return 'foggy';
    }
    return 'idea';
};
exports.inferEntry = inferEntry;
var slugify = function (text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48)
        .replace(/-+$/, '') || 'task';
};
exports.slugify = slugify;
var FLAG = /^--(start|workflow|model|effort)[= ](\S+)\s*|^--(no-pr|worktree)(?:\s+|$)/;
var isFlow = function (word) { return flows_1.FLOW_NAMES.includes(word); };
exports.isFlow = isFlow;
var isEffort = function (word) { return flows_1.EFFORTS.includes(word); };
/** One flag's options, or undefined when its value is not one it takes. */
var flagOptions = function (name, value) {
    switch (name) {
        case 'start':
            return ENTRY_WORDS[value] === undefined ? undefined : { start: ENTRY_WORDS[value] };
        case 'workflow':
            return (0, exports.isFlow)(value) ? { flow: value } : undefined;
        case 'effort':
            return isEffort(value) ? { effort: value } : undefined;
        case 'model':
            return { model: value };
        case 'no-pr':
            return { openPr: false };
        default:
            return { worktree: 'now' };
    }
};
/**
 * Parses `/flow new [--workflow f] [--start e] [--model m] [--effort e] [--no-pr]
 * [--worktree] <what are we doing>`; `bad` names the first flag it refused.
 */
var parseNew = function (args, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var text = args.trim();
    var match = FLAG.exec(text);
    if (match === null) {
        return { text: text, options: options };
    }
    var spelled = match[0], valued = match[1], _b = match[2], value = _b === void 0 ? '' : _b, bare = match[3];
    var name = (_a = valued !== null && valued !== void 0 ? valued : bare) !== null && _a !== void 0 ? _a : '';
    var found = flagOptions(name, value);
    return found === undefined
        ? { text: text, options: options, bad: "--".concat(name, " ").concat(value) }
        : (0, exports.parseNew)(text.slice(spelled.length), __assign(__assign({}, options), found));
};
exports.parseNew = parseNew;
var createTask = function (text, at, options) {
    var _a, _b, _c, _d, _e, _f;
    if (options === void 0) { options = {}; }
    var title = ((_b = (_a = options.title) !== null && _a !== void 0 ? _a : text.split('\n')[0]) !== null && _b !== void 0 ? _b : '').trim().slice(0, 72);
    var entry = (_c = options.start) !== null && _c !== void 0 ? _c : (0, exports.inferEntry)(text);
    return __assign(__assign(__assign({ slug: (0, exports.slugify)(title), title: title, entry: entry, flow: (_d = options.flow) !== null && _d !== void 0 ? _d : flows_1.FLOW_OF[entry], openPr: (_e = options.openPr) !== null && _e !== void 0 ? _e : true, worktree: (_f = options.worktree) !== null && _f !== void 0 ? _f : 'never' }, (options.model === undefined || options.model === '' ? {} : { model: options.model })), (options.effort === undefined ? {} : { effort: options.effort })), { phase: 'new', history: [], artifacts: [], log: [], createdAt: at });
};
exports.createTask = createTask;
/** A task read from disk; older files lack the later fields. */
var withDefaults = function (task) {
    var _a, _b, _c, _d, _e;
    return (__assign(__assign({}, task), { flow: (_a = task.flow) !== null && _a !== void 0 ? _a : flows_1.LEGACY_FLOW[task.entry], openPr: (_b = task.openPr) !== null && _b !== void 0 ? _b : true, worktree: (_c = task.worktree) !== null && _c !== void 0 ? _c : 'never', artifacts: (_d = task.artifacts) !== null && _d !== void 0 ? _d : [], log: (_e = task.log) !== null && _e !== void 0 ? _e : [] }));
};
exports.withDefaults = withDefaults;
/** `implement` and `implement-spec` build the same thing: either fills the other's place in a flow. */
var slot = function (stage) { return (stage === 'implement-spec' ? 'implement' : stage); };
var hasSlot = function (stages, stage) { return stages.some(function (one) { return slot(one) === slot(stage); }); };
/** The stages the task's flow runs, in order, with its on-ramp and without `pr` when no PR is wanted. */
var stagesOf = function (task) {
    var _a = flows_1.FLOWS[task.flow].stages, first = _a[0], rest = _a.slice(1);
    var onramp = flows_1.ONRAMP[task.entry];
    var stages = first === undefined ? [] : __spreadArray([onramp !== null && onramp !== void 0 ? onramp : first], rest, true);
    return task.openPr ? stages : stages.filter(function (one) { return one !== 'pr'; });
};
exports.stagesOf = stagesOf;
var isStage = function (skill, task) { return exports.STAGES.includes(skill) || (0, exports.stagesOf)(task).includes(skill); };
exports.isStage = isStage;
/** The task in the smallest bigger flow that runs `stage`, when its own flow lacks it. */
var grow = function (task, stage, at) {
    if (task.flow === 'freeform' || task.flow === 'wayfind' || hasSlot((0, exports.stagesOf)(task), stage)) {
        return task;
    }
    var bigger = flows_1.FLOW_NAMES.slice(flows_1.FLOW_NAMES.indexOf(task.flow) + 1, flows_1.FLOW_NAMES.indexOf('freeform')).find(function (flow) {
        return hasSlot((0, exports.stagesOf)(__assign(__assign({}, task), { flow: flow })), stage);
    });
    return bigger === undefined ? task : (0, exports.recordEvent)(__assign(__assign({}, task), { flow: bigger }), { kind: 'flow', detail: bigger }, at);
};
/** Whether the task records `rawSkill` at all. */
var isTracked = function (rawSkill, task) {
    return (0, exports.isStage)((0, exports.skillName)(rawSkill), task) || exports.STEPS.includes((0, exports.skillName)(rawSkill));
};
exports.isTracked = isTracked;
/** The task after `skill` ran, or the same task when the skill is not ours. */
var recordSkill = function (task, rawSkill, at) {
    var skill = (0, exports.skillName)(rawSkill);
    if (!(0, exports.isTracked)(skill, task)) {
        return task;
    }
    var grown = (0, exports.isStage)(skill, task) ? grow(task, skill, at) : task;
    var stage = stageFor(grown, skill);
    return __assign(__assign({}, grown), { phase: (0, exports.isStage)(stage, grown) ? stage : grown.phase, history: __spreadArray(__spreadArray([], grown.history, true), [{ skill: stage, at: at }], false).slice(-200) });
};
exports.recordSkill = recordSkill;
/** The stage a skill run fills: a /wayfinder after the map was charted clears it. */
var stageFor = function (task, skill) {
    return skill === 'wayfinder' &&
        (0, exports.stagesOf)(task).includes('wayfinder-clear') &&
        task.history.some(function (step) { return step.skill === 'wayfinder' || step.skill === 'wayfinder-clear'; })
        ? 'wayfinder-clear'
        : skill;
};
/** The map a Wayfind task charted: a local map file, else the first issue the charting created. */
var mapOf = function (task) {
    var _a, _b, _c;
    var charted = task.artifacts.filter(function (one) { return one.phase === 'wayfinder'; });
    return ((_b = (_a = task.artifacts.find(function (one) { return one.pointer.endsWith('/map.md'); })) === null || _a === void 0 ? void 0 : _a.pointer) !== null && _b !== void 0 ? _b : (_c = charted.find(function (one) { return /\/issues\/\d+$/.test(one.pointer); })) === null || _c === void 0 ? void 0 : _c.pointer);
};
exports.mapOf = mapOf;
/** The task with `pointer` as the current phase's latest artifact. */
var recordArtifact = function (task, pointer, at) {
    var _a;
    return ((_a = task.artifacts.at(-1)) === null || _a === void 0 ? void 0 : _a.pointer) === pointer
        ? task
        : __assign(__assign({}, task), { artifacts: __spreadArray(__spreadArray([], task.artifacts.filter(function (one) { return one.pointer !== pointer; }), true), [{ phase: task.phase, pointer: pointer, at: at }], false).slice(-100) });
};
exports.recordArtifact = recordArtifact;
/** The task with `event` logged against its current phase. */
var recordEvent = function (task, event, at) { return (__assign(__assign({}, task), { log: __spreadArray(__spreadArray([], task.log, true), [__assign(__assign({}, event), { phase: task.phase, at: at })], false).slice(-200) })); };
exports.recordEvent = recordEvent;
var hasEvent = function (task, kind) {
    return task.log.some(function (one) { return one.kind === kind && one.phase === task.phase; });
};
var isApproved = function (task) { return hasEvent(task, 'approve'); };
exports.isApproved = isApproved;
/** What a gate asks a person to read: the phase's latest artifact that is not a pull request. */
var gateArtifact = function (task) {
    return task.artifacts.filter(function (one) { return one.phase === task.phase && !/\/pull\/\d+$/.test(one.pointer); }).at(-1);
};
exports.gateArtifact = gateArtifact;
var isAllowed = function (task) { return hasEvent(task, 'allow'); };
exports.isAllowed = isAllowed;
/** Whether a gate waits on a person: an unapproved gated phase with something recorded to read. */
var isWaiting = function (task) { return task.phase in exports.GATED && !(0, exports.isApproved)(task) && (0, exports.gateArtifact)(task) !== undefined; };
exports.isWaiting = isWaiting;
var approvePhase = function (task, at) {
    return task.phase in exports.GATED && !(0, exports.isApproved)(task) ? (0, exports.recordEvent)(task, { kind: 'approve' }, at) : task;
};
exports.approvePhase = approvePhase;
var allowPhase = function (task, at) {
    return exports.PLANNING.includes(task.phase) && !(0, exports.isAllowed)(task) ? (0, exports.recordEvent)(task, { kind: 'allow' }, at) : task;
};
exports.allowPhase = allowPhase;
/** `path` relative to `root`, `.` and `..` folded; undefined outside it. */
// ponytail: lexical, symlinks not followed; the gate is advisory. $.fs.stat
// realPath of the nearest existing parent if a model ever walks around it.
var inside = function (root, path) {
    var fold = function (spelled) {
        return spelled.split('/').reduce(function (kept, part) { return (part === '..' ? kept.slice(0, -1) : part === '' || part === '.' ? kept : __spreadArray(__spreadArray([], kept, true), [part], false)); }, []);
    };
    var base = fold(root);
    var parts = fold(path.startsWith('/') ? path : "".concat(root, "/").concat(path));
    return base.every(function (part, at) { return parts[at] === part; }) ? parts.slice(base.length).join('/') : undefined;
};
exports.inside = inside;
/** The artifact pointer for a file a tool wrote under the repo, if it is one. */
var scratchPointer = function (rel) {
    return (rel === null || rel === void 0 ? void 0 : rel.startsWith('.scratch/')) && !rel.endsWith('/task.json') ? rel : undefined;
};
exports.scratchPointer = scratchPointer;
/** The issue or PR URL a `gh issue create` or `gh pr create` printed, if any. */
var createdUrl = function (command, output) {
    var _a;
    return /\bgh\s+(issue|pr)\s+create\b/.test(command)
        ? (_a = /https:\/\/\S+\/(issues|pull)\/\d+/.exec(output !== null && output !== void 0 ? output : '')) === null || _a === void 0 ? void 0 : _a[0]
        : undefined;
};
exports.createdUrl = createdUrl;
/** Why an edit to repo-relative `rel` waits in this phase, or undefined when it may go ahead. */
var editGate = function (task, rel) {
    var _a;
    var isFine = rel === undefined ||
        task.flow === 'freeform' ||
        !exports.PLANNING.includes(task.phase) ||
        (0, exports.isAllowed)(task) ||
        rel.startsWith('.scratch/') ||
        rel.endsWith('.md') ||
        ((_a = task.history.at(-1)) === null || _a === void 0 ? void 0 : _a.skill) === 'prototype';
    if (isFine) {
        return undefined;
    }
    return [
        "flow: the task \"".concat(task.title, "\" is in ").concat(task.phase, ", a planning phase, so code edits wait for /implement."),
        'Markdown, .scratch/ and prototypes are fine now.',
        'If this edit belongs in planning, stop and ask the user to run /flow allow, which lifts the gate for the rest of this phase.',
    ].join(' ');
};
exports.editGate = editGate;
/** Stages behind, the one the task is in, and the ones its flow runs after the furthest it reached. */
var rail = function (task) {
    var stages = (0, exports.stagesOf)(task);
    var now = task.phase === 'new' ? [] : [task.phase];
    var behind = __spreadArray([], new Set(task.history.map(function (step) { return step.skill; }).filter(function (skill) { return (0, exports.isStage)(skill, task); })), true).filter(function (stage) { return stage !== task.phase; });
    var reached = Math.max.apply(Math, __spreadArray([-1], __spreadArray(__spreadArray([], behind, true), now, true).map(function (stage) { return stages.findIndex(function (one) { return slot(one) === slot(stage); }); }), false));
    var ahead = stages.slice(reached + 1).filter(function (stage) { return !hasSlot(__spreadArray(__spreadArray([], behind, true), now, true), stage); });
    return __spreadArray(__spreadArray(__spreadArray([], behind.map(function (stage) { return ({ stage: stage, state: 'done' }); }), true), now.map(function (stage) { return ({ stage: stage, state: 'now' }); }), true), ahead.map(function (stage) { return ({ stage: stage, state: 'ahead' }); }), true);
};
exports.rail = rail;
var nextAction = function (task) {
    var _a, _b, _c, _d, _e;
    var gated = exports.GATED[task.phase];
    if (gated !== undefined && !(0, exports.isApproved)(task)) {
        var made = (0, exports.gateArtifact)(task);
        // Nothing recorded yet: there is nothing to approve, so the stage's own command comes first.
        return made === undefined
            ? { command: (0, flows_1.commandOf)(task.phase), why: "no ".concat(gated, " recorded yet: write it, or /flow approve <path or link>") }
            : { command: 'flow', args: 'approve', why: "read ".concat(made.pointer, ", then approve the ").concat(gated) };
    }
    // The ticket the task was made from, else its title: what the first stage reads.
    var ticket = (_b = (_a = task.artifacts.find(function (one) { return one.phase === 'new'; })) === null || _a === void 0 ? void 0 : _a.pointer) !== null && _b !== void 0 ? _b : task.title;
    if (task.flow === 'freeform') {
        return task.phase === 'new'
            ? { command: 'ask-matt', args: ticket, why: 'freeform: ask-matt picks the skill' }
            : { command: 'flow', args: 'done', why: 'freeform: run any skill, then close the task' };
    }
    var upNext = (_c = (0, exports.rail)(task).find(function (stop) { return stop.state === 'ahead'; })) === null || _c === void 0 ? void 0 : _c.stage;
    var map = (0, exports.mapOf)(task);
    // Clearing the map loops, one ticket per session, until the person says it is clear.
    if (task.phase === 'wayfinder-clear') {
        return __assign(__assign(__assign({ command: 'wayfinder' }, (map === undefined ? {} : { args: map })), { why: map === undefined ? "next frontier ticket: pass the map's link" : 'next frontier ticket, one per session; /clear between' }), (upNext === undefined ? {} : { alt: { command: (0, flows_1.commandOf)(upNext), label: 'Map is clear' } }));
    }
    if (upNext === undefined) {
        return { command: 'flow', args: 'done', why: 'close the task' };
    }
    if (upNext === 'wayfinder-clear') {
        return map === undefined
            ? { command: 'wayfinder', why: 'clear the map: pass its link; one frontier ticket per session' }
            : { command: 'wayfinder', args: map, why: (_d = flows_1.WHY[upNext]) !== null && _d !== void 0 ? _d : '' };
    }
    var why = (_e = flows_1.WHY[upNext]) !== null && _e !== void 0 ? _e : "run /".concat(upNext);
    var command = (0, flows_1.commandOf)(upNext);
    return task.phase === 'new' ? { command: command, args: ticket, why: "start here: ".concat(why) } : { command: command, why: why };
};
exports.nextAction = nextAction;
/** Where the task stands for a person; `busy` is whether a model turn runs now. */
var statusOf = function (task, busy) {
    if (task.closedAt !== undefined) {
        return 'done';
    }
    if (busy) {
        return 'working';
    }
    return (0, exports.isWaiting)(task) ? 'waiting' : 'ready';
};
exports.statusOf = statusOf;
