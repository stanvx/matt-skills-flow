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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutonomy = exports.overrideLabel = exports.overrideOf = exports.modelId = exports.gateNotice = exports.canAutoAdvance = exports.AUTO_FROM = exports.STAGE_DONE_TOOL = exports.STAGE_DONE = void 0;
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var ui_1 = require("./ui");
// The validator lists state reads per file, so each file spells its reference.
var current = { plugin: 'flow', key: 'task' };
var advance = { plugin: 'flow', key: 'advance' };
exports.STAGE_DONE = 'mcp__flow__stage_done';
/** The tool the model calls when a stage's work is finished. register.tsx registers it at session.start: one hook per event. */
exports.STAGE_DONE_TOOL = {
    name: 'stage_done',
    description: "Call this once when the work of the current flow stage is finished (not after each question), with a one-line summary of what was done. The flow mod records it and answers with the task's next step.",
    inputSchema: {
        type: 'object',
        properties: { summary: { type: 'string', description: 'One line: what this stage did.' } },
        required: ['summary'],
    },
};
/** Finished phases whose next stage may start on its own: building and closing, never planning. */
exports.AUTO_FROM = ['implement', 'implement-spec', 'diagnosing-bugs', 'pr'];
/** Whether the stage after the task's finished phase may start without a person: a stage, not a gate or the close. */
var canAutoAdvance = function (task) { return exports.AUTO_FROM.includes(task.phase) && (0, flow_1.nextAction)(task).command !== 'flow'; };
exports.canAutoAdvance = canAutoAdvance;
/** What a person should be told when a gated phase waits for them, or undefined when nothing waits. */
var gateNotice = function (task) {
    var _a, _b;
    var what = flow_1.GATED[task.phase];
    if (what === undefined || (0, flow_1.isApproved)(task)) {
        return undefined;
    }
    var made = (_b = (_a = (0, flow_1.gateArtifact)(task)) === null || _a === void 0 ? void 0 : _a.pointer) !== null && _b !== void 0 ? _b : ".scratch/".concat(task.slug, "/");
    return "flow: the ".concat(what, " is ready. Read ").concat(made, ", then /flow approve");
};
exports.gateNotice = gateNotice;
/**
 * The model id a turn step can name. `turn.step` does not resolve aliases
 * (measured: `haiku` fails the request), so a full id passes, a known alias
 * becomes its id, and any other word resolves only to the session's own
 * model when it names that family.
 */
var modelId = function (wanted, session) {
    var _a, _b;
    return wanted.includes('claude-')
        ? wanted
        : ((_b = (_a = flows_1.MODELS.find(function (one) { return one.alias === wanted; })) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (session.includes(wanted) ? session : undefined));
};
exports.modelId = modelId;
/** What to rewrite on a step, and the model that could not be resolved. */
var overrideOf = function (task, session) {
    var model = task.model === undefined ? undefined : (0, exports.modelId)(task.model, session);
    return __assign(__assign(__assign({}, (model === undefined ? {} : { model: model })), (task.effort === undefined ? {} : { effort: task.effort })), (task.model !== undefined && model === undefined ? { unresolved: task.model } : {}));
};
exports.overrideOf = overrideOf;
/** The status line while a task overrides the session's model or effort. */
var overrideLabel = function (model, effort) {
    return model === undefined && effort === undefined
        ? undefined
        : "flow: ".concat([model, effort === undefined ? undefined : model === undefined ? "".concat(effort, " effort") : "at ".concat(effort)].filter(Boolean).join(' '));
};
exports.overrideLabel = overrideLabel;
var registerAutonomy = function (on, _a) {
    var isAutoAdvance = _a.isAutoAdvance, clearAt = _a.clearAt;
    // Notices already shown, by task and phase. Lost on a reload, which shows one again at worst.
    var told = [];
    var firstTime = function (key) {
        if (told.includes(key)) {
            return false;
        }
        told = __spreadArray(__spreadArray([], told, true), [key], false);
        return true;
    };
    // The status line this hook drew, so it clears only its own.
    var shown;
    on('tool.call', { tool: exports.STAGE_DONE }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var summary, task, line, notice, isFirst;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    summary = typeof e.summary === 'string' ? e.summary.trim().slice(0, 200) : '';
                    return [4 /*yield*/, $.flow.note(__assign({ kind: 'done' }, (summary === '' ? {} : { detail: summary })))];
                case 1:
                    task = _a.sent();
                    if (task === null) {
                        return [2 /*return*/, { result: 'flow: no task is open, so nothing was recorded.' }];
                    }
                    line = (0, ui_1.commandLine)(task);
                    notice = (0, exports.gateNotice)(task);
                    if (notice !== undefined && firstTime("".concat(task.slug, ":").concat(task.phase))) {
                        $.ui.toast(notice);
                    }
                    isFirst = task.log.filter(function (one) { return one.kind === 'done' && one.phase === task.phase; }).length === 1;
                    if (!(isAutoAdvance && isFirst && (0, exports.canAutoAdvance)(task))) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.state.set(advance, true)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, {
                        result: "The flow mod recorded that ".concat(task.phase, " is finished. Next for the task: ").concat(line, " (").concat((0, flow_1.nextAction)(task).why, "). The flow mod or the person runs it, not you."),
                    }];
            }
        });
    }); });
    // A turn that answered runs the stage its stage_done left waiting; one aborted, refused or failed drops it.
    on('turn.complete', { reason: ['answer', 'aborted', 'refusal', 'error'] }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var done, _a, task, percent, expect_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    done = _d.sent();
                    _a = e.agentId !== undefined;
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.state.get(advance)];
                case 2:
                    _a = (_d.sent()).value !== true;
                    _d.label = 3;
                case 3:
                    if (_a) {
                        return [2 /*return*/, done];
                    }
                    return [4 /*yield*/, $.state.set(advance, false)];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, $.state.get(current)];
                case 5:
                    task = (_b = (_d.sent()).value) !== null && _b !== void 0 ? _b : null;
                    if (e.reason !== 'answer' || task === null || !(0, exports.canAutoAdvance)(task)) {
                        return [2 /*return*/, done];
                    }
                    return [4 /*yield*/, $.session.usage()];
                case 6:
                    percent = (_c = (_d.sent()).context.percent) !== null && _c !== void 0 ? _c : 0;
                    if (percent >= clearAt) {
                        $.ui.toast("Context ".concat(Math.round(percent), "%: /clear, then ").concat((0, ui_1.commandLine)(task), ". The task survives /clear."));
                    }
                    else {
                        expect_1 = { slug: task.slug, phase: task.phase };
                        $.clock.after(0, function () { return void $.flow.run({ expect: expect_1 }); });
                    }
                    return [2 /*return*/, done];
            }
        });
    }); });
    // A gated phase that just got its artifact waits for a person.
    on('flow.produce', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, task, notice;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    ran = _a.sent();
                    task = ran.deny === undefined ? ran.value : null;
                    notice = task === null ? undefined : (0, exports.gateNotice)(task);
                    if (task !== null && notice !== undefined && firstTime("".concat(task.slug, ":").concat(task.phase))) {
                        $.ui.toast(notice);
                    }
                    return [2 /*return*/, ran];
            }
        });
    }); });
    // The main loop runs on the open task's model and effort; subagents keep theirs.
    on('turn.step', function ($, e, next) {
        return __asyncGenerator(this, arguments, function () {
            var task, set, _a, _b, _c, _d, label;
            var _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!(e.agentId !== undefined)) return [3 /*break*/, 4];
                        return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(e))))];
                    case 1: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                    case 2: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                    case 3: return [2 /*return*/, _f.sent()];
                    case 4: return [4 /*yield*/, __await($.state.get(current))];
                    case 5:
                        task = (_e = (_f.sent()).value) !== null && _e !== void 0 ? _e : null;
                        if (!(task === null)) return [3 /*break*/, 6];
                        _a = {};
                        return [3 /*break*/, 10];
                    case 6:
                        _b = exports.overrideOf;
                        _c = [task];
                        if (!(task.model === undefined)) return [3 /*break*/, 7];
                        _d = '';
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, __await($.session.model())];
                    case 8:
                        _d = _f.sent();
                        _f.label = 9;
                    case 9:
                        _a = _b.apply(void 0, _c.concat([_d]));
                        _f.label = 10;
                    case 10:
                        set = _a;
                        label = (0, exports.overrideLabel)(set.model, set.effort);
                        if (label !== shown) {
                            shown = label;
                            $.ui.status(label);
                        }
                        if (set.unresolved !== undefined && task !== null && firstTime("".concat(task.slug, ":model:").concat(set.unresolved))) {
                            $.ui.toast("flow: \"".concat(set.unresolved, "\" is not a full model id, so this task keeps the session's model. Use an id like claude-sonnet-5-5."));
                        }
                        return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(__assign(__assign(__assign({}, e), (set.model === undefined ? {} : { model: set.model })), (set.effort === undefined ? {} : { effort: set.effort }))))))];
                    case 11: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                    case 12: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                    case 13: return [2 /*return*/, _f.sent()];
                }
            });
        });
    });
};
exports.registerAutonomy = registerAutonomy;
