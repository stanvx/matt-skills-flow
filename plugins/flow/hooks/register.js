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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.register = void 0;
var flow_1 = require("./flow");
var autonomy_1 = require("./autonomy");
var dialog_1 = require("./dialog");
var doc_1 = require("./doc");
var flows_1 = require("./flows");
var noun_1 = require("./noun");
var quickbar_1 = require("./quickbar");
var trail_1 = require("./trail");
var ui_1 = require("./ui");
var USAGE = [
    "Usage: /flow new [--workflow ".concat(flows_1.FLOW_NAMES.join('|'), "] [--start ticket|idea|broken|foggy] [--model <model>] [--effort <effort>] [--no-pr] [--worktree] <what are we doing>"),
    '/flow shows the task, /flow board lists every task, /flow switch <slug>, /flow use <workflow> changes the workflow',
    '/flow new with no text opens the new-task dialog; /flow doc [pointer] opens the artifact tab; /flow bar edits the quickbar',
    '/flow approve [path or link], /flow allow, /flow done',
    '/flow share <board artifact link> sends every task to a claude.ai board; /flow share off stops',
].join('\n');
var BOARD_LINK = /^https:\/\/claude\.ai\/(code\/)?artifact\/[\w-]+$/;
/** Origins a person stands behind: typed, or sent from their phone; the flow mod's own buttons are pressed by one. `sdk` is a host's own turn. */
var PERSON = ['composer', 'bridge'];
var describe = function (task) {
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "Task: ".concat(task.title),
        "File: .scratch/".concat(task.slug, "/task.json"),
        "Workflow: ".concat(flows_1.FLOWS[task.flow].label).concat(task.flow === 'freeform' ? ' (no fixed phases)' : ": ".concat((0, flow_1.stagesOf)(task).map(flows_1.stageLabel).join(' > ')))
    ], (task.model === undefined && task.effort === undefined ? [] : ["Runs on: ".concat([task.model, task.effort].filter(Boolean).join(' at '))]), true), [
        "Phase: ".concat(task.phase)
    ], false), task.artifacts.map(function (one) { return "Artifact: ".concat(one.pointer, " (").concat(one.phase, ")"); }), true), [
        "Next: ".concat((0, ui_1.commandLine)(task), "  (").concat((0, flow_1.nextAction)(task).why, ")"),
    ], false).join('\n');
};
var register = function (on, options) {
    var isAutoAdvance = options.autoAdvance === true;
    var clearAt = typeof options.clearAt === 'number' ? options.clearAt : 50;
    (0, noun_1.registerNoun)(on);
    (0, ui_1.registerUi)(on, clearAt);
    (0, dialog_1.registerDialog)(on);
    (0, doc_1.registerDoc)(on);
    (0, quickbar_1.registerQuickbar)(on);
    (0, autonomy_1.registerAutonomy)(on, { isAutoAdvance: isAutoAdvance, clearAt: clearAt });
    on('session.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var pr, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, $.command.register({
                        name: 'flow',
                        description: 'Track a task through the idea-to-ship flow',
                        argumentHint: '[new [<what are we doing>] | board | switch <slug> | flow <flow> | doc [pointer] | bar | share <link> | approve | allow | done]',
                    })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, $.tool.register(autonomy_1.STAGE_DONE_TOOL)];
                case 2:
                    _b.sent();
                    _a = trail_1.unsettledPr;
                    return [4 /*yield*/, $.flow.resume()];
                case 3:
                    pr = _a.apply(void 0, [_b.sent()]);
                    if (!(pr !== undefined)) return [3 /*break*/, 5];
                    return [4 /*yield*/, $.flow.watch({ url: pr })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [4 /*yield*/, $.flow.task()];
                case 6:
                    if (!((_b.sent()) === null)) return [3 /*break*/, 8];
                    return [4 /*yield*/, $.ui.open({ id: ui_1.BOARD, title: 'flow board' }).catch(function () { return undefined; })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [2 /*return*/, next(e)];
            }
        });
    }); });
    // A tracked skill moves or records the task, and its prompt carries the
    // task, the phase, the artifacts so far and what that skill can use.
    on('skill.prompt', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var task, git, _a, _b, _c;
        var _d;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, $.flow.enter({ skill: e.skill })];
                case 1:
                    task = _f.sent();
                    if (task === null || !(0, flow_1.isTracked)(e.skill, task)) {
                        return [2 /*return*/, next(e)];
                    }
                    _b = (_a = $.process)
                        .run;
                    _c = [['git', 'branch', '--show-current']];
                    _d = {};
                    return [4 /*yield*/, $.session.root()];
                case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.cwd = _f.sent(), _d)]))
                        .catch(function () { return undefined; })];
                case 3:
                    git = _f.sent();
                    return [2 /*return*/, next(__assign(__assign({}, e), { text: "".concat(e.text, "\n\n").concat((0, trail_1.reminder)(task, e.skill, (_e = git === null || git === void 0 ? void 0 : git.stdout.trim()) !== null && _e !== void 0 ? _e : '')) }))];
            }
        });
    }); });
    // Planning phases hold code edits until /implement; /flow allow lifts it.
    on('tool.call', { tool: ['Write', 'Edit', 'NotebookEdit'] }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var task, path, rel, _a, _b, deny, ran, pointer;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, $.flow.task()];
                case 1:
                    task = _c.sent();
                    path = e.tool === 'NotebookEdit' ? e.notebook_path : e.file_path;
                    if (!(task === null || typeof path !== 'string')) return [3 /*break*/, 2];
                    _a = undefined;
                    return [3 /*break*/, 4];
                case 2:
                    _b = flow_1.inside;
                    return [4 /*yield*/, $.session.root()];
                case 3:
                    _a = _b.apply(void 0, [_c.sent(), path]);
                    _c.label = 4;
                case 4:
                    rel = _a;
                    deny = task === null ? undefined : (0, flow_1.editGate)(task, rel);
                    if (!(deny !== undefined)) return [3 /*break*/, 6];
                    return [4 /*yield*/, $.flow.note({ kind: 'held', detail: rel })];
                case 5:
                    _c.sent();
                    return [2 /*return*/, { deny: deny }];
                case 6: return [4 /*yield*/, next(e)];
                case 7:
                    ran = _c.sent();
                    pointer = (0, flow_1.scratchPointer)(rel);
                    if (!(pointer !== undefined && ran.deny === undefined && ran.isError === undefined)) return [3 /*break*/, 9];
                    return [4 /*yield*/, $.flow.produce({ pointer: pointer })];
                case 8:
                    _c.sent();
                    _c.label = 9;
                case 9: return [2 /*return*/, ran];
            }
        });
    }); });
    // Checks become PR evidence; a created issue or PR becomes an artifact,
    // and a PR's CI is watched until it settles.
    on('tool.call', { tool: 'Bash' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, command, check, url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    ran = _a.sent();
                    if (ran.deny !== undefined) {
                        return [2 /*return*/, ran];
                    }
                    command = typeof e.command === 'string' ? e.command : '';
                    check = (0, trail_1.checkOf)(command);
                    if (!(check !== undefined)) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.flow.note({ kind: 'check', detail: check, ok: ran.isError !== true })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    url = (0, flow_1.createdUrl)(command, ran.text);
                    if (!(url !== undefined)) return [3 /*break*/, 6];
                    return [4 /*yield*/, $.flow.produce({ pointer: url })];
                case 4:
                    _a.sent();
                    if (!url.includes('/pull/')) return [3 /*break*/, 6];
                    return [4 /*yield*/, $.flow.watch({ url: url })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/, ran];
            }
        });
    }); });
    on('command.run', { command: 'flow' }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, verb, _c, rest, open, tasks, link, url, sent, _d, _e, left, _f, text, options_1, bad, _g, task, isNew, existing, _h, _, reopened, flow, moved_1, _j, _k, isPerson, _l, _m, _o, named, _p, moved, upNext, percent, expect_1;
        var _q, _r;
        var _s, _t, _u;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    _a = (_s = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim())) !== null && _s !== void 0 ? _s : [], _b = _a[1], verb = _b === void 0 ? '' : _b, _c = _a[2], rest = _c === void 0 ? '' : _c;
                    return [4 /*yield*/, $.flow.task()];
                case 1:
                    open = _v.sent();
                    if (!(verb === '')) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.ui.open({ id: ui_1.RAIL, title: 'flow' })];
                case 2:
                    _v.sent();
                    return [2 /*return*/, { text: open === null ? "No open task.\n".concat(USAGE) : describe(open) }];
                case 3:
                    if (!(verb === 'board')) return [3 /*break*/, 6];
                    return [4 /*yield*/, $.ui.open({ id: ui_1.BOARD, title: 'flow board' })];
                case 4:
                    _v.sent();
                    return [4 /*yield*/, $.flow.all()];
                case 5:
                    tasks = _v.sent();
                    return [2 /*return*/, {
                            text: tasks.length === 0
                                ? 'No tasks under .scratch/ yet.'
                                : tasks.map(function (one) { return "".concat(one.closedAt === undefined ? one.phase : 'closed', "  ").concat(one.title, "  (").concat(one.slug, ")"); }).join('\n'),
                        }];
                case 6:
                    if (!(verb === 'share')) return [3 /*break*/, 14];
                    link = rest.trim();
                    if (!(link === '')) return [3 /*break*/, 8];
                    return [4 /*yield*/, $.flow.board()];
                case 7:
                    url = _v.sent();
                    return [2 /*return*/, { text: url === null ? "No board yet.\n".concat(USAGE) : "Tasks go to ".concat(url) }];
                case 8:
                    if (!(link === 'off')) return [3 /*break*/, 10];
                    return [4 /*yield*/, $.flow.share({ url: null })];
                case 9:
                    _v.sent();
                    return [2 /*return*/, { text: 'Stopped sending tasks to the board. What it shows stays until you delete the artifact.' }];
                case 10:
                    if (!BOARD_LINK.test(link)) {
                        return [2 /*return*/, { text: 'That is not a claude.ai artifact link (https://claude.ai/.../artifact/...).' }];
                    }
                    return [4 /*yield*/, $.flow.share({ url: link })];
                case 11:
                    _v.sent();
                    _e = (_d = $.flow).sync;
                    _q = {};
                    return [4 /*yield*/, $.flow.all()];
                case 12: return [4 /*yield*/, _e.apply(_d, [(_q.tasks = _v.sent(), _q)])];
                case 13:
                    sent = _v.sent();
                    return [2 /*return*/, { text: "Sent ".concat(sent, " task").concat(sent === 1 ? '' : 's', " to ").concat(link, ". Each change follows a few seconds later.") }];
                case 14:
                    left = function (task) { return (open !== null && open.slug !== task.slug ? " (".concat(open.title, " stays on disk)") : ''); };
                    if (!(verb === 'new')) return [3 /*break*/, 17];
                    _f = (0, flow_1.parseNew)(rest), text = _f.text, options_1 = _f.options, bad = _f.bad;
                    if (text === '' || bad !== undefined) {
                        return [2 /*return*/, { text: bad === undefined ? USAGE : "".concat(bad, " is not a value it takes.\n").concat(USAGE) }];
                    }
                    return [4 /*yield*/, $.flow.create(__assign({ text: text }, options_1))];
                case 15:
                    _g = _v.sent(), task = _g.task, isNew = _g.isNew;
                    return [4 /*yield*/, $.ui.open({ id: ui_1.RAIL, title: 'flow' })];
                case 16:
                    _v.sent();
                    return [2 /*return*/, { text: "".concat(isNew ? 'Opened' : 'Resumed').concat(left(task), ".\n").concat(describe(task)) }];
                case 17:
                    if (!(verb === 'switch')) return [3 /*break*/, 23];
                    if (!(rest.trim() === '')) return [3 /*break*/, 18];
                    _h = null;
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, $.flow.load({ slug: rest.trim() })];
                case 19:
                    _h = _v.sent();
                    _v.label = 20;
                case 20:
                    existing = _h;
                    if (existing === null) {
                        return [2 /*return*/, { text: "No task at .scratch/".concat(rest.trim(), "/task.json. /flow board lists them.") }];
                    }
                    _ = existing.closedAt, reopened = __rest(existing, ["closedAt"]);
                    return [4 /*yield*/, $.flow.save(reopened)];
                case 21:
                    _v.sent();
                    return [4 /*yield*/, $.ui.open({ id: ui_1.RAIL, title: 'flow' })];
                case 22:
                    _v.sent();
                    return [2 /*return*/, { text: "Resumed".concat(left(reopened), ".\n").concat(describe(reopened)) }];
                case 23:
                    if (!['done', 'approve', 'allow', 'use'].includes(verb)) {
                        return [2 /*return*/, { text: USAGE }];
                    }
                    if (open === null) {
                        return [2 /*return*/, { text: 'No open task.' }];
                    }
                    if (!(verb === 'use')) return [3 /*break*/, 26];
                    flow = rest.trim();
                    if (!(0, flow_1.isFlow)(flow)) {
                        return [2 /*return*/, { text: "Usage: /flow use ".concat(flows_1.FLOW_NAMES.join('|')) }];
                    }
                    _j = flow_1.recordEvent;
                    _k = [__assign(__assign({}, open), { flow: flow }), { kind: 'flow', detail: flow }];
                    return [4 /*yield*/, $.clock.now()];
                case 24:
                    moved_1 = _j.apply(void 0, _k.concat([_v.sent()]));
                    return [4 /*yield*/, $.flow.save(moved_1)];
                case 25:
                    _v.sent();
                    return [2 /*return*/, { text: "".concat(open.title, " now follows ").concat(flows_1.FLOWS[flow].label, ".\n").concat(describe(moved_1)) }];
                case 26:
                    isPerson = PERSON.includes(e.origin.kind) || (e.origin.kind === 'plugin' && e.origin.name === 'flow');
                    if ((verb === 'approve' || verb === 'allow') && !isPerson) {
                        return [2 /*return*/, { text: "/flow ".concat(verb, " waits for a person; it was sent from ").concat(e.origin.kind, ".") }];
                    }
                    if (!(verb === 'done')) return [3 /*break*/, 29];
                    _m = (_l = $.flow).save;
                    _o = [__assign({}, open)];
                    _r = {};
                    return [4 /*yield*/, $.clock.now()];
                case 27: return [4 /*yield*/, _m.apply(_l, [__assign.apply(void 0, _o.concat([(_r.closedAt = _v.sent(), _r)]))])];
                case 28:
                    _v.sent();
                    return [2 /*return*/, { text: "Closed: ".concat(open.title) }];
                case 29:
                    if (!(verb === 'allow')) return [3 /*break*/, 31];
                    if ((0, flow_1.allowPhase)(open, 0) === open) {
                        return [2 /*return*/, { text: "Code edits are not held in ".concat(open.phase, ".") }];
                    }
                    return [4 /*yield*/, $.flow.allow()];
                case 30:
                    _v.sent();
                    return [2 /*return*/, { text: "Code edits allowed for the rest of ".concat(open.phase, ".") }];
                case 31:
                    if ((0, flow_1.approvePhase)(open, 0) === open) {
                        return [2 /*return*/, { text: "Nothing waits for approval in ".concat(open.phase, ".") }];
                    }
                    if (!(rest.trim() === '')) return [3 /*break*/, 32];
                    _p = open;
                    return [3 /*break*/, 34];
                case 32: return [4 /*yield*/, $.flow.produce({ pointer: rest.trim() })];
                case 33:
                    _p = ((_t = (_v.sent())) !== null && _t !== void 0 ? _t : open);
                    _v.label = 34;
                case 34:
                    named = _p;
                    if ((0, flow_1.gateArtifact)(named) === undefined) {
                        return [2 /*return*/, { text: "No ".concat(flow_1.GATED[open.phase], " recorded for ").concat(open.phase, ". /flow approve <path or link> names the one you read.") }];
                    }
                    return [4 /*yield*/, $.flow.approve()];
                case 35:
                    moved = _v.sent();
                    upNext = moved === null ? '' : " Next: ".concat((0, ui_1.commandLine)(moved));
                    return [4 /*yield*/, $.session.usage()];
                case 36:
                    percent = (_u = (_v.sent()).context.percent) !== null && _u !== void 0 ? _u : 0;
                    // A gate is a phase boundary: the cheapest moment to /clear, so say so once, here.
                    if (percent >= clearAt) {
                        $.ui.toast("Context ".concat(Math.round(percent), "%: /clear, then").concat(upNext.replace(' Next:', ''), ". The task survives /clear."));
                    }
                    else if (isAutoAdvance) {
                        expect_1 = moved === null ? undefined : { slug: moved.slug, phase: moved.phase };
                        $.clock.after(0, function () { return void $.flow.run({ expect: expect_1 }); });
                    }
                    return [2 /*return*/, { text: "Approved ".concat(open.phase, ".").concat(upNext) }];
            }
        });
    }); });
};
exports.register = register;
