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
var dialog_1 = require("../hooks/dialog");
var flows_1 = require("../hooks/flows");
var fake_1 = require("./fake");
var SURFACES = ['terminal', 'desktop'];
var GRILL = { name: 'mattpocock-skills:grill-with-docs', description: 'grill', source: 'plugin' };
var IMPLEMENT = { name: 'mattpocock-skills:implement', description: 'implement', source: 'plugin' };
var GH_ISSUE = JSON.stringify({ title: 'Retry failed payments', body: 'It should retry.', url: 'https://github.com/o/r/issues/123' });
var pane = function (surface, bodyColumns) {
    if (bodyColumns === void 0) { bodyColumns = 100; }
    return ({
        plugin: 'flow',
        surface: surface,
        component: 'Pane',
        requestId: dialog_1.DIALOG,
        props: { title: 'New task', isFocused: true, bodyColumns: bodyColumns, placement: 'inline', scroll: { offset: 0, bodyRows: 24 }, view: {} },
    });
};
// Events this file answers itself; fakeRepo's answers for them are left out so the two never collide.
var OURS = ['ui.open', 'process.run', 'session.surfaces', 'session.model', 'command.list', 'command.run', 'ui.close'];
var leaving = function (on) {
    return (function (name) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        return OURS.includes(name) ? undefined : on.apply(void 0, __spreadArray([name], rest, false));
    });
};
/** A repo where the dialog can open; records what the mod asked the engine to do. */
var dialogRepo = function (on, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var ran = [];
    var opened = [];
    var argvs = [];
    var gh = (_a = options.gh) !== null && _a !== void 0 ? _a : { exitCode: 0, stdout: GH_ISSUE, stderr: '' };
    on('ui.open', function (_, e) {
        opened.push(e);
        return { value: { isPlaced: true } };
    });
    on('process.run', function (_, e) {
        argvs.push(e.argv);
        return { value: __assign(__assign({}, (e.argv[0] === 'gh' ? gh : { exitCode: 0, stdout: 'feature\n', stderr: '' })), { isStdoutTruncated: false, isStderrTruncated: false }) };
    });
    on('session.surfaces', function () { var _a; return ({ value: (_a = options.surfaces) !== null && _a !== void 0 ? _a : ['terminal'] }); });
    on('session.model', function () { return ({ value: 'claude-opus-4-8' }); });
    on('command.list', function () { return ({ value: [GRILL, IMPLEMENT] }); });
    on('command.run', function (_, e) {
        ran.push({ command: e.command, args: e.args });
        return { text: '' };
    });
    on('ui.close', function () { return ({ value: undefined }); });
    return __assign({ ran: ran, opened: opened, argvs: argvs }, (0, fake_1.fakeRepo)(leaving(on)));
};
var taskOn = function (files, slug) { var _a; return JSON.parse((_a = files.get("/repo/.scratch/".concat(slug, "/task.json"))) !== null && _a !== void 0 ? _a : 'null'); };
var flowOf = function (ui) { return __awaiter(void 0, void 0, void 0, function () {
    var marks;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, Promise.all(flows_1.FLOW_NAMES.map(function (name) { return __awaiter(void 0, void 0, void 0, function () { var _a; var _b; return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = [name];
                            return [4 /*yield*/, ui.find({ key: "flow-".concat(name) })];
                        case 1: return [2 /*return*/, _a.concat([(_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.props.variant])];
                    }
                }); }); }))];
            case 1:
                marks = _b.sent();
                return [2 /*return*/, (_a = marks.find(function (_a) {
                        var variant = _a[1];
                        return variant === 'primary';
                    })) === null || _a === void 0 ? void 0 : _a[0]];
        }
    });
}); };
(0, testing_1.test)('/flow new opens the dialog as a focused pane, and text still opens a task', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, opened, made;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = dialogRepo(on), files = _a.files, opened = _a.opened;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _d.sent();
                (0, testing_1.expect)(opened.at(0)).toMatchObject({ id: dialog_1.DIALOG, title: 'New task', focus: true, closeOnEscape: true, holdToasts: true });
                (0, testing_1.expect)((_b = opened.at(0)) === null || _b === void 0 ? void 0 : _b.rows).toBeGreaterThan(0);
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout'))];
            case 2:
                made = _d.sent();
                (0, testing_1.expect)(made.text).toContain('Opened');
                (0, testing_1.expect)((_c = taskOn(files, 'retry-failed-checkout')) === null || _c === void 0 ? void 0 : _c.title).toBe('Retry failed checkout');
                (0, testing_1.expect)(opened.map(function (one) { return one.id; })).toEqual([dialog_1.DIALOG, 'flow']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a surface with no fields gets the usage text instead', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var opened, answer;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                opened = dialogRepo(on, { surfaces: ['mobile'] }).opened;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                answer = _a.sent();
                (0, testing_1.expect)(answer.text).toContain('Usage: /flow new');
                (0, testing_1.expect)(opened).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the form fills in, and Create writes the task and starts the first stage', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, ran, opened, _loop_1, _i, SURFACES_1, surface;
    var _b, _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _a = dialogRepo(on), files = _a.files, ran = _a.ran, opened = _a.opened;
                on('model.classify', function () { return ({ value: 'spec: A spec and tickets you approve, built across sessions' }); });
                _loop_1 = function (surface) {
                    var ui, _l, _m, _o, _p, _q, _r, stagesShown, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
                    return __generator(this, function (_2) {
                        switch (_2.label) {
                            case 0: return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
                            case 1:
                                _2.sent();
                                return [4 /*yield*/, $.ui.mount(pane(surface))];
                            case 2:
                                ui = _2.sent();
                                _l = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'what' })];
                            case 3:
                                _l.apply(void 0, [_2.sent()]).toMatchObject({ props: { value: '' } });
                                _m = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'model' })];
                            case 4:
                                _m.apply(void 0, [(_b = (_2.sent())) === null || _b === void 0 ? void 0 : _b.props.options]).toEqual([
                                    { value: '', label: 'Session default (claude-opus-4-8)' },
                                    { value: 'fable', label: 'Fable 5.1' },
                                    { value: 'opus', label: 'Opus 5.5' },
                                    { value: 'sonnet', label: 'Sonnet 5.5' },
                                    { value: 'haiku', label: 'Haiku 4.5' },
                                ]);
                                return [4 /*yield*/, ui.input({ key: 'what', text: 'Retry failed checkout payments', kind: 'change' })];
                            case 5:
                                _2.sent();
                                _o = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'name' })];
                            case 6:
                                _o.apply(void 0, [_2.sent()]).toMatchObject({ props: { value: 'Retry failed checkout payments' } });
                                _p = testing_1.expect;
                                return [4 /*yield*/, ui.find({ type: 'Text', text: /\.scratch\// })];
                            case 7:
                                _p.apply(void 0, [(_c = (_2.sent())) === null || _c === void 0 ? void 0 : _c.text]).toBe('.scratch/retry-failed-checkout-payments/');
                                _q = testing_1.expect;
                                return [4 /*yield*/, flowOf(ui)];
                            case 8:
                                _q.apply(void 0, [_2.sent()]).toBe('grill');
                                _r = testing_1.expect;
                                return [4 /*yield*/, ui.find({ type: 'Text', text: /guessed/ })];
                            case 9:
                                _r.apply(void 0, [(_d = (_2.sent())) === null || _d === void 0 ? void 0 : _d.text]).toBe('Settle the decisions, then build in one session (guessed from what you typed)');
                                stagesShown = function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var _a;
                                    var _b;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0:
                                                if (!(surface === 'terminal')) return [3 /*break*/, 2];
                                                return [4 /*yield*/, ui.findAll({ type: 'Text', text: /^○ / })];
                                            case 1:
                                                _a = (_c.sent()).map(function (chip) { return chip.text; });
                                                return [3 /*break*/, 4];
                                            case 2: return [4 /*yield*/, ui.find({ type: 'Svg' })];
                                            case 3:
                                                _a = [(_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.props.alt];
                                                _c.label = 4;
                                            case 4: return [2 /*return*/, _a];
                                        }
                                    });
                                }); };
                                _s = testing_1.expect;
                                return [4 /*yield*/, stagesShown()];
                            case 10:
                                _s.apply(void 0, [_2.sent()]).toEqual(surface === 'terminal'
                                    ? ['○ Settle decisions', '○ Build', '○ Open the PR', '○ Look back']
                                    : ['Stages: Settle decisions (ahead), Build (ahead), Open the PR (ahead), Look back (ahead)']);
                                return [4 /*yield*/, ui.press({ key: 'flow-oneshot' })];
                            case 11:
                                _2.sent();
                                _t = testing_1.expect;
                                return [4 /*yield*/, flowOf(ui)];
                            case 12:
                                _t.apply(void 0, [_2.sent()]).toBe('oneshot');
                                _u = testing_1.expect;
                                return [4 /*yield*/, stagesShown()];
                            case 13:
                                _u.apply(void 0, [(_2.sent()).join(' ')]).not.toContain('Settle decisions');
                                return [4 /*yield*/, ui.press({ key: 'pr' })];
                            case 14:
                                _2.sent();
                                _v = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'pr' })];
                            case 15:
                                _v.apply(void 0, [(_e = (_2.sent())) === null || _e === void 0 ? void 0 : _e.props.label]).toBe('[ ] Open a PR when done');
                                return [4 /*yield*/, ui.press({ key: 'worktree-now' })];
                            case 16:
                                _2.sent();
                                _w = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'worktree-now' })];
                            case 17:
                                _w.apply(void 0, [(_f = (_2.sent())) === null || _f === void 0 ? void 0 : _f.props.variant]).toBe('primary');
                                _x = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'worktree-never' })];
                            case 18:
                                _x.apply(void 0, [(_g = (_2.sent())) === null || _g === void 0 ? void 0 : _g.props.hotkey]).toBe('w');
                                return [4 /*yield*/, ui.select({ key: 'model', value: 'sonnet' })];
                            case 19:
                                _2.sent();
                                return [4 /*yield*/, ui.select({ key: 'effort', value: 'high' })];
                            case 20:
                                _2.sent();
                                _y = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'model' })];
                            case 21:
                                _y.apply(void 0, [(_h = (_2.sent())) === null || _h === void 0 ? void 0 : _h.props.value]).toBe('sonnet');
                                return [4 /*yield*/, ui.input({ key: 'name', text: 'Retry payments', kind: 'change' })];
                            case 22:
                                _2.sent();
                                _z = testing_1.expect;
                                return [4 /*yield*/, ui.find({ type: 'Text', text: /\.scratch\// })];
                            case 23:
                                _z.apply(void 0, [(_j = (_2.sent())) === null || _j === void 0 ? void 0 : _j.text]).toBe('.scratch/retry-payments/');
                                // Typing on keeps a name set by hand.
                                return [4 /*yield*/, ui.input({ key: 'what', text: 'Retry failed checkout payments now', kind: 'change' })];
                            case 24:
                                // Typing on keeps a name set by hand.
                                _2.sent();
                                _0 = testing_1.expect;
                                return [4 /*yield*/, ui.find({ key: 'name' })];
                            case 25:
                                _0.apply(void 0, [_2.sent()]).toMatchObject({ props: { value: 'Retry payments' } });
                                ran.length = 0;
                                opened.length = 0;
                                return [4 /*yield*/, ui.press({ key: 'create' })];
                            case 26:
                                _2.sent();
                                (0, testing_1.expect)(taskOn(files, 'retry-payments')).toMatchObject({
                                    title: 'Retry payments',
                                    flow: 'oneshot',
                                    openPr: false,
                                    worktree: 'now',
                                    model: 'sonnet',
                                    effort: 'high',
                                    phase: 'new',
                                });
                                (0, testing_1.expect)(ran).toEqual([{ command: 'mattpocock-skills:implement', args: 'Retry payments' }]);
                                (0, testing_1.expect)(opened.map(function (one) { return one.id; })).toEqual(['flow']);
                                _1 = testing_1.expect;
                                return [4 /*yield*/, ui.find({ type: 'Text', text: /Closed/ })];
                            case 27:
                                _1.apply(void 0, [_2.sent()]).toBeDefined();
                                return [4 /*yield*/, ui.unmount()];
                            case 28:
                                _2.sent();
                                files.clear();
                                return [2 /*return*/];
                        }
                    });
                };
                _i = 0, SURFACES_1 = SURFACES;
                _k.label = 1;
            case 1:
                if (!(_i < SURFACES_1.length)) return [3 /*break*/, 4];
                surface = SURFACES_1[_i];
                return [5 /*yield**/, _loop_1(surface)];
            case 2:
                _k.sent();
                _k.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('Enter on the description refines a guessed flow, never a picked one', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var asked, ui, _a, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                dialogRepo(on);
                asked = [];
                on('model.classify', function (_, e) {
                    var _a;
                    asked.push({ text: e.text, labels: e.labels, model: (_a = e.options) === null || _a === void 0 ? void 0 : _a.model });
                    return { value: 'spec: A spec and tickets you approve, built across sessions' };
                });
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _d.sent();
                return [4 /*yield*/, $.ui.mount(pane('terminal'))];
            case 2:
                ui = _d.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Rework billing', kind: 'change' })];
            case 3:
                _d.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Rework billing' })];
            case 4:
                _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, flowOf(ui)];
            case 5:
                _a.apply(void 0, [_d.sent()]).toBe('spec');
                (0, testing_1.expect)(asked).toHaveLength(1);
                (0, testing_1.expect)(asked[0]).toMatchObject({ text: 'Rework billing', model: 'haiku' });
                (0, testing_1.expect)((_c = asked[0]) === null || _c === void 0 ? void 0 : _c.labels.map(function (label) { return label.split(':')[0]; })).toEqual(['oneshot', 'grill', 'spec', 'wayfind', 'freeform']);
                return [4 /*yield*/, ui.press({ key: 'flow-freeform' })];
            case 6:
                _d.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Rework billing' })];
            case 7:
                _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, flowOf(ui)];
            case 8:
                _b.apply(void 0, [_d.sent()]).toBe('freeform');
                return [4 /*yield*/, ui.input({ key: 'what', text: '#12' })];
            case 9:
                _d.sent();
                (0, testing_1.expect)(asked).toHaveLength(1);
                return [4 /*yield*/, ui.input({ key: 'name', text: 'Billing' })];
            case 10:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a failed classifier leaves the guess alone', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ui, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                dialogRepo(on);
                on('model.classify', function () {
                    throw new Error('no quota');
                });
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.ui.mount(pane('terminal'))];
            case 2:
                ui = _b.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Rework billing' })];
            case 3:
                _b.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, flowOf(ui)];
            case 4:
                _a.apply(void 0, [_b.sent()]).toBe('grill');
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('multi-line text is kept as ticket.md and handed to the first stage', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, ran, ui;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = dialogRepo(on), files = _a.files, ran = _a.ran;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _c.sent();
                return [4 /*yield*/, $.ui.mount(pane('desktop'))];
            case 2:
                ui = _c.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Retry checkout\nKeep the cart\nCap at 3 tries', kind: 'change' })];
            case 3:
                _c.sent();
                return [4 /*yield*/, ui.press({ key: 'create' })];
            case 4:
                _c.sent();
                (0, testing_1.expect)(files.get('/repo/.scratch/retry-checkout/ticket.md')).toBe('Retry checkout\nKeep the cart\nCap at 3 tries\n');
                (0, testing_1.expect)((_b = taskOn(files, 'retry-checkout')) === null || _b === void 0 ? void 0 : _b.artifacts).toEqual([{ phase: 'new', pointer: '.scratch/retry-checkout/ticket.md', at: 1000 }]);
                (0, testing_1.expect)(ran).toEqual([{ command: 'mattpocock-skills:grill-with-docs', args: '.scratch/retry-checkout/ticket.md' }]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('Create with no text shows why and does nothing; Cancel closes and clears the draft', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, ran, opened, _i, SURFACES_2, surface, ui, _b, _c, _d, _e;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _a = dialogRepo(on), files = _a.files, ran = _a.ran, opened = _a.opened;
                _i = 0, SURFACES_2 = SURFACES;
                _g.label = 1;
            case 1:
                if (!(_i < SURFACES_2.length)) return [3 /*break*/, 13];
                surface = SURFACES_2[_i];
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 2:
                _g.sent();
                return [4 /*yield*/, $.ui.mount(pane(surface))];
            case 3:
                ui = _g.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, ui.find({ type: 'Text', text: /Describe what to build first/ })];
            case 4:
                _b.apply(void 0, [(_f = (_g.sent())) === null || _f === void 0 ? void 0 : _f.props.dimColor]).toBe(true);
                return [4 /*yield*/, ui.press({ key: 'create' })];
            case 5:
                _g.sent();
                (0, testing_1.expect)(ran).toEqual([]);
                (0, testing_1.expect)(files.size).toBe(0);
                _c = testing_1.expect;
                return [4 /*yield*/, ui.find({ key: 'what' })];
            case 6:
                _c.apply(void 0, [_g.sent()]).toBeDefined();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'Something', kind: 'change' })];
            case 7:
                _g.sent();
                return [4 /*yield*/, ui.press({ key: 'cancel' })];
            case 8:
                _g.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, ui.find({ type: 'Text', text: /Closed/ })];
            case 9:
                _d.apply(void 0, [_g.sent()]).toBeDefined();
                _e = testing_1.expect;
                return [4 /*yield*/, ui.find({ key: 'what' })];
            case 10:
                _e.apply(void 0, [_g.sent()]).toBeUndefined();
                (0, testing_1.expect)(ran).toEqual([]);
                (0, testing_1.expect)(files.size).toBe(0);
                return [4 /*yield*/, ui.unmount()];
            case 11:
                _g.sent();
                _g.label = 12;
            case 12:
                _i++;
                return [3 /*break*/, 1];
            case 13:
                (0, testing_1.expect)(opened.map(function (one) { return one.id; })).toEqual([dialog_1.DIALOG, dialog_1.DIALOG]);
                return [2 /*return*/];
        }
    });
}); });
// The keys of the Buttons in each Box row of a drawn tree.
var buttonRows = function (tree) {
    if (typeof tree !== 'object' || tree === null) {
        return [];
    }
    var _a = tree.children, children = _a === void 0 ? [] : _a;
    var keys = children.flatMap(function (one) {
        var _a = (one !== null && one !== void 0 ? one : {}), type = _a.type, props = _a.props;
        return type === 'Button' && (props === null || props === void 0 ? void 0 : props.key) !== undefined ? [props.key] : [];
    });
    return __spreadArray(__spreadArray([], (keys.length === 0 ? [] : [keys]), true), children.flatMap(buttonRows), true);
};
(0, testing_1.test)('the workflow buttons stack 2x2 on a narrow pane', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var flows, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                dialogRepo(on);
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _c.sent();
                flows = function (columns) { return __awaiter(void 0, void 0, void 0, function () {
                    var ui, rows, _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, $.ui.mount(pane('terminal', columns))];
                            case 1:
                                ui = _b.sent();
                                _a = buttonRows;
                                return [4 /*yield*/, ui.drawn()];
                            case 2:
                                rows = _a.apply(void 0, [_b.sent()]).map(function (row) { return row.filter(function (key) { return key.startsWith('flow-'); }); });
                                return [4 /*yield*/, ui.unmount()];
                            case 3:
                                _b.sent();
                                return [2 /*return*/, rows.filter(function (row) { return row.length > 0; })];
                        }
                    });
                }); };
                _a = testing_1.expect;
                return [4 /*yield*/, flows(100)];
            case 2:
                _a.apply(void 0, [_c.sent()]).toEqual([['flow-oneshot', 'flow-grill', 'flow-spec', 'flow-wayfind', 'flow-freeform']]);
                _b = testing_1.expect;
                return [4 /*yield*/, flows(40)];
            case 3:
                _b.apply(void 0, [_c.sent()]).toEqual([
                    ['flow-oneshot', 'flow-grill', 'flow-spec'],
                    ['flow-wayfind', 'flow-freeform'],
                ]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a GitHub issue reference is fetched and becomes the ticket', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, ran, argvs, ui;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = dialogRepo(on), files = _a.files, ran = _a.ran, argvs = _a.argvs;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.ui.mount(pane('terminal'))];
            case 2:
                ui = _b.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: '#123', kind: 'change' })];
            case 3:
                _b.sent();
                return [4 /*yield*/, ui.press({ key: 'create' })];
            case 4:
                _b.sent();
                (0, testing_1.expect)(argvs.filter(function (one) { return one[0] === 'gh'; })).toEqual([['gh', 'issue', 'view', '123', '--json', 'title,body,url']]);
                (0, testing_1.expect)(taskOn(files, 'retry-failed-payments')).toMatchObject({ title: 'Retry failed payments', entry: 'ticket', flow: 'oneshot' });
                (0, testing_1.expect)(files.get('/repo/.scratch/retry-failed-payments/ticket.md')).toBe('# Retry failed payments\n\nhttps://github.com/o/r/issues/123\n\nIt should retry.\n');
                (0, testing_1.expect)(ran).toEqual([{ command: 'mattpocock-skills:implement', args: '.scratch/retry-failed-payments/ticket.md' }]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a GitHub failure toasts the reason and keeps the dialog open', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, ran, toasts, ui, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = dialogRepo(on, {
                    gh: { exitCode: 1, stdout: '', stderr: 'Could not resolve to an issue\n' },
                }), files = _a.files, ran = _a.ran, toasts = _a.toasts;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new'))];
            case 1:
                _c.sent();
                return [4 /*yield*/, $.ui.mount(pane('terminal'))];
            case 2:
                ui = _c.sent();
                return [4 /*yield*/, ui.input({ key: 'what', text: 'https://github.com/o/r/issues/9', kind: 'change' })];
            case 3:
                _c.sent();
                return [4 /*yield*/, ui.press({ key: 'create' })];
            case 4:
                _c.sent();
                (0, testing_1.expect)(toasts.join('\n')).toContain('Could not resolve to an issue');
                (0, testing_1.expect)(files.size).toBe(0);
                (0, testing_1.expect)(ran).toEqual([]);
                _b = testing_1.expect;
                return [4 /*yield*/, ui.find({ key: 'what' })];
            case 5:
                _b.apply(void 0, [_c.sent()]).toMatchObject({ props: { value: 'https://github.com/o/r/issues/9' } });
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('mobile draws a pointer to the command instead of fields', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ui, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                dialogRepo(on, { surfaces: ['mobile'] });
                return [4 /*yield*/, $.ui.mount(pane('mobile'))];
            case 1:
                ui = _b.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, ui.find({ type: 'Text', text: /\/flow new/ })];
            case 2:
                _a.apply(void 0, [_b.sent()]).toBeDefined();
                return [2 /*return*/];
        }
    });
}); });
