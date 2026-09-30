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
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var autonomy_1 = require("../hooks/autonomy");
var flow_1 = require("../hooks/flow");
var trail_1 = require("../hooks/trail");
var fake_1 = require("./fake");
var STAGE_DONE = 'mcp__flow__stage_done';
var at = function (task) {
    var skills = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        skills[_i - 1] = arguments[_i];
    }
    return skills.reduce(function (moved, skill, index) { return (0, flow_1.recordSkill)(moved, skill, index + 1); }, task);
};
(0, testing_1.test)('only a finished build or closing stage may start the next stage on its own', function () {
    var oneshot = (0, flow_1.createTask)('Retry checkout', 0, { flow: 'oneshot' });
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(oneshot, 'implement'))).toBe(true);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(oneshot, 'implement', 'pr'))).toBe(true);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(oneshot, 'implement', 'pr', 'retro'))).toBe(false);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(oneshot)).toBe(false);
    var spec = (0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' });
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(spec, 'grill-with-docs'))).toBe(false);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(spec, 'grill-with-docs', 'to-spec'))).toBe(false);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)((0, flow_1.approvePhase)(at(spec, 'to-tickets'), 9))).toBe(false);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at(spec, 'implement-spec'))).toBe(true);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at((0, flow_1.createTask)('Retry checkout', 0, { flow: 'freeform' }), 'implement'))).toBe(false);
    (0, testing_1.expect)((0, autonomy_1.canAutoAdvance)(at((0, flow_1.createTask)('Checkout crashes', 0), 'diagnosing-bugs'))).toBe(true);
});
(0, testing_1.test)('a gated phase announces its artifact until approved', function () {
    var specced = at((0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' }), 'to-spec');
    (0, testing_1.expect)((0, autonomy_1.gateNotice)(specced)).toBe('flow: the spec is ready. Read .scratch/retry-checkout/, then /flow approve');
    var written = (0, flow_1.recordArtifact)(specced, '.scratch/retry-checkout/spec.md', 3);
    (0, testing_1.expect)((0, autonomy_1.gateNotice)(written)).toBe('flow: the spec is ready. Read .scratch/retry-checkout/spec.md, then /flow approve');
    (0, testing_1.expect)((0, autonomy_1.gateNotice)((0, flow_1.approvePhase)(written, 4))).toBeUndefined();
    (0, testing_1.expect)((0, autonomy_1.gateNotice)(at(specced, 'implement'))).toBeUndefined();
});
(0, testing_1.test)('turn.step needs a full model id: known aliases map to theirs, other words only to the session model', function () {
    (0, testing_1.expect)((0, autonomy_1.modelId)('claude-sonnet-5-5', 'claude-opus-5')).toBe('claude-sonnet-5-5');
    (0, testing_1.expect)((0, autonomy_1.modelId)('sonnet', 'claude-opus-5')).toBe('claude-sonnet-5-5');
    (0, testing_1.expect)((0, autonomy_1.modelId)('opus-5', 'claude-opus-5')).toBe('claude-opus-5');
    (0, testing_1.expect)((0, autonomy_1.modelId)('mythos', 'claude-opus-5')).toBeUndefined();
    var task = (0, flow_1.createTask)('Retry checkout', 0, { model: 'mythos', effort: 'high' });
    (0, testing_1.expect)((0, autonomy_1.overrideOf)(task, 'claude-opus-5')).toEqual({ effort: 'high', unresolved: 'mythos' });
    (0, testing_1.expect)((0, autonomy_1.overrideOf)((0, flow_1.createTask)('Retry checkout', 0), 'claude-opus-5')).toEqual({});
    (0, testing_1.expect)((0, autonomy_1.overrideLabel)('claude-opus-5', 'high')).toBe('flow: claude-opus-5 at high');
    (0, testing_1.expect)((0, autonomy_1.overrideLabel)(undefined, 'high')).toBe('flow: high effort');
    (0, testing_1.expect)((0, autonomy_1.overrideLabel)(undefined, undefined)).toBeUndefined();
});
(0, testing_1.test)('a stage skill reminds the model to report when its stage is finished', function () {
    var task = at((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs');
    (0, testing_1.expect)((0, trail_1.reminder)(task, 'grill-with-docs', 'feature')).toContain('call mcp__flow__stage_done with a one-line summary');
    (0, testing_1.expect)((0, trail_1.reminder)(task, 'tdd', 'feature')).not.toContain('stage_done');
});
(0, testing_1.test)('stage_done is registered at session start and records the event', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var registered, files, _a, done, log;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                registered = [];
                on('tool.register', function (_, e) {
                    registered.push(e.name);
                    return { value: { tool: "mcp__flow__".concat(e.name) } };
                });
                on('command.register', function () { return ({ value: { command: 'flow' } }); });
                on('session.start', function () { return ({ cwd: '/repo' }); });
                files = (0, fake_1.fakeRepo)(on).files;
                return [4 /*yield*/, $.session.start({ cwd: '/repo', surface: null, isInteractive: false })];
            case 1:
                _c.sent();
                (0, testing_1.expect)(registered).toEqual(['stage_done']);
                _a = testing_1.expect;
                return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'x' })];
            case 2:
                _a.apply(void 0, [(_c.sent()).text]).toBeUndefined();
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 3:
                _c.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
            case 4:
                _c.sent();
                return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'settled the retry policy' })];
            case 5:
                done = _c.sent();
                (0, testing_1.expect)(done.deny).toBeUndefined();
                (0, testing_1.expect)(done.result).toContain('Next for the task: /implement');
                log = JSON.parse((_b = files.get('/repo/.scratch/retry-failed-checkout-payments/task.json')) !== null && _b !== void 0 ? _b : '{}').log;
                (0, testing_1.expect)(log.at(-1)).toEqual({ kind: 'done', detail: 'settled the retry policy', phase: 'grill-with-docs', at: 1000 });
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('without autoAdvance, stage_done never runs a stage', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ran, clock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ran = [];
                on('command.run', function (_, e) {
                    ran.push(e.command);
                    return { text: '' };
                });
                clock = (0, fake_1.fakeRepo)(on).clock;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow oneshot Retry failed checkout payments'))];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'implement', text: 'build' })];
            case 2:
                _a.sent();
                return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'built' })];
            case 3:
                _a.sent();
                return [4 /*yield*/, clock.advance(0)];
            case 4:
                _a.sent();
                (0, testing_1.expect)(ran).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
var advances = function ($_1, on_1, flags_1, skills_1) {
    var args_1 = [];
    for (var _i = 4; _i < arguments.length; _i++) {
        args_1[_i - 4] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([$_1, on_1, flags_1, skills_1], args_1, true), void 0, function ($, on, flags, skills, percent, turnEnd) {
        var ran, _a, clock, toasts, _b, skills_2, skill;
        if (percent === void 0) { percent = 10; }
        if (turnEnd === void 0) { turnEnd = 'answer'; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    ran = [];
                    on('command.list', function () { return ({
                        value: ['pr', 'retro', 'implement', 'to-tickets'].map(function (name) { return ({ name: "mattpocock-skills:".concat(name), description: name, source: 'plugin' }); }),
                    }); });
                    on('command.run', function (_, e) {
                        ran.push(e.command);
                        return { text: '' };
                    });
                    on('turn.complete', function () { return ({ text: '' }); });
                    _a = (0, fake_1.fakeRepo)(on, percent), clock = _a.clock, toasts = _a.toasts;
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)("new ".concat(flags, " Retry failed checkout payments")))];
                case 1:
                    _c.sent();
                    _b = 0, skills_2 = skills;
                    _c.label = 2;
                case 2:
                    if (!(_b < skills_2.length)) return [3 /*break*/, 5];
                    skill = skills_2[_b];
                    return [4 /*yield*/, $.skill.prompt({ skill: skill, text: skill })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _b++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'done' })];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, clock.advance(0)
                        // Nothing runs mid-turn: the next stage waits for the turn to answer.
                    ];
                case 7:
                    _c.sent();
                    // Nothing runs mid-turn: the next stage waits for the turn to answer.
                    (0, testing_1.expect)(ran).toEqual([]);
                    return [4 /*yield*/, $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: turnEnd })];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, clock.advance(0)];
                case 9:
                    _c.sent();
                    return [2 /*return*/, { ran: ran, toasts: toasts }];
            }
        });
    });
};
(0, testing_1.test)('with autoAdvance a finished build stage runs the next one', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow oneshot', ['implement'])];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual(['mattpocock-skills:pr']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with autoAdvance an interrupted turn drops the advance', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow oneshot', ['implement'], 10, 'aborted')];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with autoAdvance a finished pr stage runs the retro', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow oneshot', ['implement', 'pr'])];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual(['mattpocock-skills:retro']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('autoAdvance never starts a build from planning, crosses a gate or runs past the retro', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow grill', ['grill-with-docs'])];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('autoAdvance stops at a gate', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow spec', ['grill-with-docs', 'to-spec'])];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('autoAdvance stops after the retro', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, advances($, on, '--workflow oneshot', ['implement', 'pr', 'retro'])];
            case 1:
                _a.apply(void 0, [(_b.sent()).ran]).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a full context holds autoAdvance with a toast', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, ran, toasts;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, advances($, on, '--workflow oneshot', ['implement'], 80)];
            case 1:
                _a = _b.sent(), ran = _a.ran, toasts = _a.toasts;
                (0, testing_1.expect)(ran).toEqual([]);
                (0, testing_1.expect)(toasts).toEqual(['Context 80%: /clear, then /pr. The task survives /clear.']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a gate that gets its artifact, or is reported done, toasts once', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var toasts, dir;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                toasts = (0, fake_1.fakeRepo)(on).toasts;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 2:
                _a.sent();
                (0, testing_1.expect)(toasts).toEqual([]);
                dir = '.scratch/retry-failed-checkout-payments';
                return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: "/repo/".concat(dir, "/spec.md"), content: 'spec' })];
            case 3:
                _a.sent();
                (0, testing_1.expect)(toasts).toEqual(["flow: the spec is ready. Read ".concat(dir, "/spec.md, then /flow approve")]);
                return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'spec written' })];
            case 4:
                _a.sent();
                return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: "/repo/".concat(dir, "/spec-2.md"), content: 'more' })];
            case 5:
                _a.sent();
                (0, testing_1.expect)(toasts).toHaveLength(1);
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
            case 6:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-tickets', text: 'tickets' })];
            case 7:
                _a.sent();
                return [4 /*yield*/, $.tool.call({ tool: STAGE_DONE, summary: 'tickets written' })];
            case 8:
                _a.sent();
                (0, testing_1.expect)(toasts).toEqual([
                    "flow: the spec is ready. Read ".concat(dir, "/spec.md, then /flow approve"),
                    "flow: the tickets is ready. Read ".concat(dir, "/, then /flow approve"),
                ]);
                return [2 /*return*/];
        }
    });
}); });
var step = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ turnId: 't1', index: 0, model: 'claude-opus-5', effort: 'medium', messageCount: 3 }, overrides));
};
var drain = function (stream) { return __awaiter(void 0, void 0, void 0, function () {
    var chunk, e_1_1;
    var _a, stream_1, stream_1_1;
    var _b, e_1, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 5, 6, 11]);
                _a = true, stream_1 = __asyncValues(stream);
                _e.label = 1;
            case 1: return [4 /*yield*/, stream_1.next()];
            case 2:
                if (!(stream_1_1 = _e.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 4];
                _d = stream_1_1.value;
                _a = false;
                chunk = _d;
                void chunk;
                _e.label = 3;
            case 3:
                _a = true;
                return [3 /*break*/, 1];
            case 4: return [3 /*break*/, 11];
            case 5:
                e_1_1 = _e.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 11];
            case 6:
                _e.trys.push([6, , 9, 10]);
                if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 8];
                return [4 /*yield*/, _c.call(stream_1)];
            case 7:
                _e.sent();
                _e.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 10: return [7 /*endfinally*/];
            case 11: return [2 /*return*/, stream.result];
        }
    });
}); };
var stepper = function (on) {
    var seen = [];
    var statuses = [];
    on('turn.step', function (_, e) {
        return __asyncGenerator(this, arguments, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        seen.push(e);
                        return [4 /*yield*/, __await({ turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    });
    on('session.model', function () { return ({ value: 'claude-opus-5' }); });
    on('ui.status', function (_, e) {
        statuses.push(e.text);
        return { value: undefined };
    });
    return { seen: seen, statuses: statuses };
};
(0, testing_1.test)('turn.step runs main-loop steps on the task model and effort, and leaves subagents alone', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, seen, statuses;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                (0, fake_1.fakeRepo)(on);
                _a = stepper(on), seen = _a.seen, statuses = _a.statuses;
                return [4 /*yield*/, drain($.turn.step(step()))];
            case 1:
                _b.sent();
                (0, testing_1.expect)(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium' });
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --model claude-sonnet-5-5 --effort high Retry failed checkout payments'))];
            case 2:
                _b.sent();
                return [4 /*yield*/, drain($.turn.step(step()))];
            case 3:
                _b.sent();
                (0, testing_1.expect)(seen.at(-1)).toMatchObject({ model: 'claude-sonnet-5-5', effort: 'high' });
                (0, testing_1.expect)(statuses.at(-1)).toBe('flow: claude-sonnet-5-5 at high');
                return [4 /*yield*/, drain($.turn.step(step({ agentId: 'a1' })))];
            case 4:
                _b.sent();
                (0, testing_1.expect)(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium', agentId: 'a1' });
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('done'))];
            case 5:
                _b.sent();
                return [4 /*yield*/, drain($.turn.step(step()))];
            case 6:
                _b.sent();
                (0, testing_1.expect)(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'medium' });
                (0, testing_1.expect)(statuses.at(-1)).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('an unknown model word keeps the session model, applies the effort and says so once', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var toasts, seen;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                toasts = (0, fake_1.fakeRepo)(on).toasts;
                seen = stepper(on).seen;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --model mythos --effort low Retry failed checkout payments'))];
            case 1:
                _a.sent();
                return [4 /*yield*/, drain($.turn.step(step()))];
            case 2:
                _a.sent();
                return [4 /*yield*/, drain($.turn.step(step()))];
            case 3:
                _a.sent();
                (0, testing_1.expect)(seen.at(-1)).toMatchObject({ model: 'claude-opus-5', effort: 'low' });
                (0, testing_1.expect)(toasts).toHaveLength(1);
                (0, testing_1.expect)(toasts[0]).toContain('"mythos" is not a full model id');
                return [2 /*return*/];
        }
    });
}); });
var pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} };
(0, testing_1.test)('a worktree task runs each stage in its worktree, entered once, with the task files linked in', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ran, _a, files, calls, runs, entered, ui;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                on('command.list', function () { return ({ value: [{ name: 'mattpocock-skills:implement', description: 'implement', source: 'plugin' }] }); });
                ran = [];
                on('command.run', function (_, e) {
                    ran.push(e.command);
                    return { text: '' };
                });
                _a = (0, fake_1.fakeRepo)(on), files = _a.files, calls = _a.calls, runs = _a.runs;
                entered = function () { return calls.filter(function (call) { return call.tool === 'EnterWorktree'; }); };
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --worktree --workflow oneshot Add webhook retries'))];
            case 1:
                _b.sent();
                (0, testing_1.expect)(entered()).toEqual([]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: 'terminal', component: 'Pane', requestId: 'flow', props: pane })];
            case 2:
                ui = _b.sent();
                return [4 /*yield*/, ui.press({ key: 'next' })];
            case 3:
                _b.sent();
                (0, testing_1.expect)(entered()).toMatchObject([{ tool: 'EnterWorktree', name: 'add-webhook-retries' }]);
                (0, testing_1.expect)(runs).toContainEqual(['ln', '-s', '/repo/.scratch', '/repo/.claude/worktrees/add-webhook-retries/.scratch']);
                (0, testing_1.expect)(ran).toEqual(['mattpocock-skills:implement']);
                (0, testing_1.expect)(__spreadArray([], files.keys(), true)).toContain('/repo/.scratch/add-webhook-retries/task.json');
                return [4 /*yield*/, ui.press({ key: 'next' })];
            case 4:
                _b.sent();
                (0, testing_1.expect)(entered()).toHaveLength(1);
                (0, testing_1.expect)(ran).toHaveLength(2);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('two changes at once both land: the noun runs them one at a time', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var files, saved;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                files = (0, fake_1.fakeRepo)(on).files;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 2:
                _b.sent();
                return [4 /*yield*/, Promise.all([
                        $.tool.call({ tool: STAGE_DONE, summary: 'specced' }),
                        $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: '# Spec' }),
                    ])];
            case 3:
                _b.sent();
                saved = JSON.parse((_a = files.get('/repo/.scratch/retry-failed-checkout-payments/task.json')) !== null && _a !== void 0 ? _a : '{}');
                (0, testing_1.expect)(saved.log.some(function (one) { return one.kind === 'done'; })).toBe(true);
                (0, testing_1.expect)(saved.artifacts.map(function (one) { return one.pointer; })).toContain('.scratch/retry-failed-checkout-payments/spec.md');
                return [2 /*return*/];
        }
    });
}); });
