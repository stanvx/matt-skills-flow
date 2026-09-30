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
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var status_1 = require("../hooks/status");
var flow_1 = require("../hooks/flow");
var fake_1 = require("./fake");
var SURFACES = ['terminal', 'desktop'];
var scroll = { offset: 0, bodyRows: 40 };
var pane = { title: 'flow', isFocused: true, bodyColumns: 90, placement: 'dock', scroll: scroll, view: {} };
var band = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 90, scroll: scroll, view: {} };
/** The engine calls the UI needs answered: the turn events, and a command list holding what the tests press. */
var mockEngine = function (on, names) {
    if (names === void 0) { names = []; }
    var ran = [];
    // What the engine draws for the band when the plugin yields to it.
    on('ui.render', function () { return ({ type: 'Text', props: {}, children: [] }); });
    on('turn.start', function (_, e) { return ({ turnId: e.turnId }); });
    on('turn.complete', function () { return ({ text: '' }); });
    on('command.list', function () { return ({ value: names.map(function (name) { return ({ name: name, description: name, source: 'plugin' }); }) }); });
    // Below the plugin: only commands the plugin's own hook does not answer land here.
    on('command.run', function (_, e) {
        var _a;
        ran.push("".concat(e.command, " ").concat((_a = e.args) !== null && _a !== void 0 ? _a : '').trim());
        return { text: '' };
    });
    return ran;
};
(0, testing_1.test)('the statuses, stage progress and key hints read from the task', function () {
    var spec = (0, flow_1.createTask)('Retry checkout', 0, { flow: 'spec' });
    (0, testing_1.expect)((0, status_1.progress)(spec)).toEqual({ at: 0, of: 6 });
    (0, testing_1.expect)((0, status_1.stageText)(spec)).toBe('not started');
    var specced = (0, flow_1.recordSkill)((0, flow_1.recordSkill)(spec, 'grill-with-docs', 1), 'to-spec', 2);
    (0, testing_1.expect)((0, status_1.stageText)(specced)).toBe('stage 2 of 6');
    (0, testing_1.expect)((0, status_1.badgeText)('Spec', specced)).toBe('Spec 2/6');
    (0, testing_1.expect)((0, status_1.subline)(__assign(__assign({}, specced), { model: 'opus', effort: 'high' }))).toBe('.scratch/retry-checkout · stage 2 of 6 · model opus · effort high');
    var free = (0, flow_1.createTask)('Poke around', 0, { flow: 'freeform' });
    (0, testing_1.expect)((0, status_1.progress)(free)).toBeUndefined();
    (0, testing_1.expect)((0, status_1.badgeText)('Freeform', free)).toBe('Freeform');
    (0, testing_1.expect)((0, status_1.skillsRun)((0, flow_1.recordSkill)((0, flow_1.recordSkill)(free, 'research', 1), 'tdd', 2))).toEqual(['research', 'tdd']);
    (0, testing_1.expect)((0, status_1.gateText)('waiting')).toBe('waiting for approval');
    (0, testing_1.expect)((0, status_1.gateText)('ahead')).toBeUndefined();
    (0, testing_1.expect)((0, status_1.keyHints)(specced)).toBe('n next · e allow edits · b board · ctrl+x tab focus · esc back');
    (0, testing_1.expect)((0, status_1.keyHints)((0, flow_1.recordArtifact)(specced, '.scratch/retry-checkout/spec.md', 3))).toContain('o artifact');
    (0, testing_1.expect)((0, status_1.fitsOneLine)(80, '/flow approve', 'read the spec')).toBe(true);
    (0, testing_1.expect)((0, status_1.fitsOneLine)(20, '/flow approve', 'read the spec')).toBe(false);
    (0, testing_1.expect)((0, status_1.boardOrder)([__assign(__assign({}, spec), { closedAt: 5 }), specced, free]).map(function (one) { return one.slug; })).toEqual([
        'retry-checkout',
        'poke-around',
        'retry-checkout',
    ]);
});
var _loop_1 = function (surface) {
    (0, testing_1.test)("".concat(surface, ": the empty pane gives directions and a New task button"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, ui, _a, _b, _c, _d, button;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    ran = mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 1:
                    ui = _f.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /1\. \/flow new opens the new-task dialog/ })];
                case 2:
                    _a.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.type]).toBe('Text');
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /Pick a workflow: Oneshot, Grill, Spec, Wayfind, Freeform/ })];
                case 3:
                    _b.apply(void 0, [_f.sent()]).toBeDefined();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /Press n to run each stage/ })];
                case 4:
                    _c.apply(void 0, [_f.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '/flow board lists every task' })];
                case 5:
                    _d.apply(void 0, [_f.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.find({ key: 'new' })];
                case 6:
                    button = _f.sent();
                    (0, testing_1.expect)(button === null || button === void 0 ? void 0 : button.props).toMatchObject({ label: 'New task', hotkey: 'n', variant: 'primary' });
                    // A plugin's own command calls land beneath its hooks, so the test's engine sees them.
                    return [4 /*yield*/, ui.press({ key: 'new' })];
                case 7:
                    // A plugin's own command calls land beneath its hooks, so the test's engine sees them.
                    _f.sent();
                    (0, testing_1.expect)(ran).toEqual(['flow new']);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": a Spec task at an unapproved to-spec waits for you and approves first"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        var _p, _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
                case 1:
                    _r.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
                case 2:
                    _r.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
                case 3:
                    _r.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: 'x' })];
                case 4:
                    _r.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 5:
                    ui = _r.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: 'Waiting for you' })];
                case 6:
                    _a.apply(void 0, [(_p = (_r.sent())) === null || _p === void 0 ? void 0 : _p.props]).toMatchObject({ color: 'yellow', bold: true });
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: ' Spec ' })];
                case 7:
                    _b.apply(void 0, [_r.sent()]).toBeDefined();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /\.scratch\/retry-failed-checkout-payments · stage 2 of 6/ })];
                case 8:
                    _c.apply(void 0, [_r.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /2\. ● Write the spec/ })];
                case 9:
                    _d.apply(void 0, [_r.sent()]).toBeDefined();
                    _e = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '  /to-spec' })];
                case 10:
                    _e.apply(void 0, [_r.sent()]).toBeDefined();
                    _f = testing_1.expect;
                    return [4 /*yield*/, ui.find(surface === 'terminal' ? { type: 'Text', text: '● Write the spec' } : { type: 'Svg' })];
                case 11:
                    _f.apply(void 0, [_r.sent()]).toBeDefined();
                    _g = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /waiting for approval/ })];
                case 12:
                    _g.apply(void 0, [_r.sent()]).toBeDefined();
                    _h = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /retry-failed-checkout-payments\/spec\.md/ })];
                case 13:
                    _h.apply(void 0, [_r.sent()]).toBeDefined();
                    _j = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 14:
                    _j.apply(void 0, [(_q = (_r.sent())) === null || _q === void 0 ? void 0 : _q.props]).toMatchObject({ label: '/flow approve', hotkey: 'n', variant: 'primary' });
                    _k = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'doc' })];
                case 15:
                    _k.apply(void 0, [_r.sent()]).toBeDefined();
                    _l = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'board' })];
                case 16:
                    _l.apply(void 0, [_r.sent()]).toBeDefined();
                    _m = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /Recent activity/ })];
                case 17:
                    _m.apply(void 0, [_r.sent()]).toBeDefined();
                    _o = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /^n next · o artifact · e allow edits/ })];
                case 18:
                    _o.apply(void 0, [_r.sent()]).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": a clearing map loops on /wayfinder and offers Map is clear"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, ui, _a, _b, _c, _d;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    ran = mockEngine(on, ['mattpocock-skills:wayfinder', 'mattpocock-skills:to-spec']);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new greenfield billing service'))];
                case 1:
                    _g.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'wayfinder', text: 'chart' })];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/greenfield-billing-service/map.md', content: '# Map' })];
                case 3:
                    _g.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'wayfinder', text: 'clear' })];
                case 4:
                    _g.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 5:
                    ui = _g.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 6:
                    _a.apply(void 0, [(_e = (_g.sent())) === null || _e === void 0 ? void 0 : _e.props.label]).toBe('/wayfinder .scratch/greenfield-billing-service/map.md');
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /2\. ● Clear the map/ })];
                case 7:
                    _b.apply(void 0, [_g.sent()]).toBeDefined();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '     1 ticket session so far' })];
                case 8:
                    _c.apply(void 0, [_g.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'alt' })];
                case 9:
                    _d.apply(void 0, [(_f = (_g.sent())) === null || _f === void 0 ? void 0 : _f.props.label]).toBe('Map is clear: /to-spec');
                    return [4 /*yield*/, ui.press({ key: 'alt' })];
                case 10:
                    _g.sent();
                    (0, testing_1.expect)(ran).toEqual(['mattpocock-skills:to-spec']);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": pressing the primary button runs the next command"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, ui, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    ran = mockEngine(on, ['mattpocock-skills:grill-with-docs']);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow grill Retry failed checkout payments'))];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 2:
                    ui = _c.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 3:
                    _a.apply(void 0, [(_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.props.label]).toBe('/grill-with-docs Retry failed checkout payments');
                    return [4 /*yield*/, ui.press({ key: 'next' })];
                case 4:
                    _c.sent();
                    (0, testing_1.expect)(ran).toEqual(['mattpocock-skills:grill-with-docs Retry failed checkout payments']);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": approving moves the pane on"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, ui, _a, _b, _c;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    ran = mockEngine(on, ['flow']);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry checkout'))];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
                case 2:
                    _f.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })];
                case 3:
                    _f.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 4:
                    ui = _f.sent();
                    return [4 /*yield*/, ui.press({ key: 'next' })];
                case 5:
                    _f.sent();
                    (0, testing_1.expect)(ran).toEqual(['flow approve']);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
                case 6:
                    _f.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /approved/ })];
                case 7:
                    _a.apply(void 0, [_f.sent()]).toBeDefined();
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 8:
                    _b.apply(void 0, [(_d = (_f.sent())) === null || _d === void 0 ? void 0 : _d.props.label]).toBe('/to-tickets');
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: 'Ready' })];
                case 9:
                    _c.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.props]).toMatchObject({ color: 'green' });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": the band shows the badge, progress and the next step"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var writing, _a, _b, _c, _d, _e, _f, ui, frames, _g, _h, _j, _k, _l, _m, _o, _p, short, _q, _r, _s, _t;
        var _u, _v, _w, _x, _y, _z, _0;
        return __generator(this, function (_1) {
            switch (_1.label) {
                case 0:
                    mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry checkout'))];
                case 1:
                    _1.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
                case 2:
                    _1.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })
                        // No spec recorded yet: nothing waits, and 1 runs the stage again, drawn as a bordered chip.
                    ];
                case 3:
                    _1.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: band })];
                case 4:
                    writing = _1.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, writing.find({ type: 'Text', text: '  ● Ready' })];
                case 5:
                    _a.apply(void 0, [_1.sent()]).toBeDefined();
                    _b = testing_1.expect;
                    return [4 /*yield*/, writing.find({ key: 'next' })];
                case 6:
                    _b.apply(void 0, [(_u = (_1.sent())) === null || _u === void 0 ? void 0 : _u.props]).toMatchObject({ label: '/to-spec', hotkey: '1', variant: 'primary' });
                    _c = testing_1.expect;
                    return [4 /*yield*/, writing.find({ key: 'next' })];
                case 7:
                    _c.apply(void 0, [(_v = (_1.sent())) === null || _v === void 0 ? void 0 : _v.props.plain]).toBeUndefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, writing.find({ type: 'Text', text: /no spec recorded yet: write it, or \/flow approve <path or link>/ })];
                case 8:
                    _d.apply(void 0, [_1.sent()]).toBeDefined();
                    _e = testing_1.expect;
                    return [4 /*yield*/, writing.find({ key: 'bar-2' })];
                case 9:
                    _e.apply(void 0, [(_w = (_1.sent())) === null || _w === void 0 ? void 0 : _w.props]).toMatchObject({ label: 'continue', hotkey: '2' });
                    _f = testing_1.expect;
                    return [4 /*yield*/, writing.find({ key: 'bar-2' })];
                case 10:
                    _f.apply(void 0, [(_x = (_1.sent())) === null || _x === void 0 ? void 0 : _x.props.plain]).toBeUndefined();
                    return [4 /*yield*/, writing.unmount()];
                case 11:
                    _1.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })];
                case 12:
                    _1.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: band })
                        // A framed panel: the workflow chip, the task and its status, the stages in words, the next step.
                    ];
                case 13:
                    ui = _1.sent();
                    return [4 /*yield*/, ui.findAll({ type: 'Box' })];
                case 14:
                    frames = _1.sent();
                    (0, testing_1.expect)(frames.some(function (box) { return box.props.borderStyle === 'round' && box.props.borderColor === 'yellow'; })).toBe(true);
                    _g = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: ' SPEC 2/6 ' })];
                case 15:
                    _g.apply(void 0, [_1.sent()]).toBeDefined();
                    _h = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '  Retry checkout' })];
                case 16:
                    _h.apply(void 0, [_1.sent()]).toBeDefined();
                    _j = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '  ◆ Waiting for you' })];
                case 17:
                    _j.apply(void 0, [_1.sent()]).toBeDefined();
                    _k = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '● Write the spec' })];
                case 18:
                    _k.apply(void 0, [_1.sent()]).toBeDefined();
                    // Approving takes a focused n; 1 reads the spec.
                    _l = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 19:
                    // Approving takes a focused n; 1 reads the spec.
                    _l.apply(void 0, [(_y = (_1.sent())) === null || _y === void 0 ? void 0 : _y.props]).toMatchObject({ label: '/flow approve', hotkey: 'n', variant: 'primary' });
                    _m = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'next' })];
                case 20:
                    _m.apply(void 0, [(_z = (_1.sent())) === null || _z === void 0 ? void 0 : _z.props.plain]).toBeUndefined();
                    _o = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: / read \.scratch\/retry-checkout\/spec\.md, then approve the spec/ })];
                case 21:
                    _o.apply(void 0, [_1.sent()]).toBeDefined();
                    _p = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'bar-1' })];
                case 22:
                    _p.apply(void 0, [(_0 = (_1.sent())) === null || _0 === void 0 ? void 0 : _0.props]).toMatchObject({ label: 'Read the spec', hotkey: '1' });
                    return [4 /*yield*/, ui.unmount()
                        // Too few rows for the panel: one line.
                    ];
                case 23:
                    _1.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: __assign(__assign({}, band), { maxRows: 4 }) })];
                case 24:
                    short = _1.sent();
                    _q = testing_1.expect;
                    return [4 /*yield*/, short.find({ type: 'Text', text: ' Spec 2/6 ' })];
                case 25:
                    _q.apply(void 0, [_1.sent()]).toBeDefined();
                    _r = testing_1.expect;
                    return [4 /*yield*/, short.find({ type: 'Text', text: ' Write the spec · ' })];
                case 26:
                    _r.apply(void 0, [_1.sent()]).toBeDefined();
                    _s = testing_1.expect;
                    return [4 /*yield*/, short.find({ type: 'Text', text: 'Waiting for you' })];
                case 27:
                    _s.apply(void 0, [_1.sent()]).toBeDefined();
                    _t = testing_1.expect;
                    return [4 /*yield*/, short.find({ key: 'bar-1' })];
                case 28:
                    _t.apply(void 0, [_1.sent()]).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": the band yields to a survey and nudges at a full context"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, survey, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    mockEngine(on);
                    (0, fake_1.fakeRepo)(on, 80);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry checkout'))];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: band })];
                case 2:
                    ui = _c.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /context 80%: \/clear first/ })];
                case 3:
                    _a.apply(void 0, [_c.sent()]).toBeDefined();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: __assign(__assign({}, band), { hasSurvey: true }) })];
                case 4:
                    survey = _c.sent();
                    _b = testing_1.expect;
                    return [4 /*yield*/, survey.find({ key: 'next' })];
                case 5:
                    _b.apply(void 0, [_c.sent()]).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": a running turn shows Working in the pane, the band and the board"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var pane1, band1, board1, _a, _b, _c, _d, _e, _f, _g;
        var _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry checkout'))];
                case 1:
                    _l.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 2:
                    pane1 = _l.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', props: band })];
                case 3:
                    band1 = _l.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-board', props: pane })];
                case 4:
                    board1 = _l.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, pane1.find({ type: 'Text', text: 'Ready' })];
                case 5:
                    _a.apply(void 0, [_l.sent()]).toBeDefined();
                    _b = testing_1.expect;
                    return [4 /*yield*/, board1.find({ type: 'Text', text: '> ● ' })];
                case 6:
                    _b.apply(void 0, [(_h = (_l.sent())) === null || _h === void 0 ? void 0 : _h.props]).toMatchObject({ color: 'green' });
                    return [4 /*yield*/, $.turn.start({ text: 'go', turnId: 't1' })];
                case 7:
                    _l.sent();
                    _c = testing_1.expect;
                    return [4 /*yield*/, pane1.find({ type: 'Text', text: 'Working' })];
                case 8:
                    _c.apply(void 0, [(_j = (_l.sent())) === null || _j === void 0 ? void 0 : _j.props]).toMatchObject({ dimColor: true });
                    _d = testing_1.expect;
                    return [4 /*yield*/, band1.find({ type: 'Text', text: 'Working' })];
                case 9:
                    _d.apply(void 0, [_l.sent()]).toBeDefined();
                    _e = testing_1.expect;
                    return [4 /*yield*/, board1.find({ type: 'Text', text: '> ● ' })];
                case 10:
                    _e.apply(void 0, [(_k = (_l.sent())) === null || _k === void 0 ? void 0 : _k.props]).toMatchObject({ dimColor: true });
                    // A subagent finishing does not end the main turn.
                    return [4 /*yield*/, $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't2', agentId: 'sub', reason: 'answer' })];
                case 11:
                    // A subagent finishing does not end the main turn.
                    _l.sent();
                    _f = testing_1.expect;
                    return [4 /*yield*/, pane1.find({ type: 'Text', text: 'Working' })];
                case 12:
                    _f.apply(void 0, [_l.sent()]).toBeDefined();
                    return [4 /*yield*/, $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })];
                case 13:
                    _l.sent();
                    _g = testing_1.expect;
                    return [4 /*yield*/, pane1.find({ type: 'Text', text: 'Ready' })];
                case 14:
                    _g.apply(void 0, [_l.sent()]).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": a planning task offers Allow edits, and Freeform lists the skills run"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, _b, free, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry checkout'))];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
                case 2:
                    _f.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 3:
                    ui = _f.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'allow' })];
                case 4:
                    _a.apply(void 0, [_f.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.press({ key: 'allow' })];
                case 5:
                    _f.sent();
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'allow' })];
                case 6:
                    _b.apply(void 0, [_f.sent()]).toBeUndefined();
                    return [4 /*yield*/, ui.unmount()];
                case 7:
                    _f.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow freeform Poke around'))];
                case 8:
                    _f.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'research', text: 'r' })];
                case 9:
                    _f.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'tdd', text: 't' })];
                case 10:
                    _f.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow', props: pane })];
                case 11:
                    free = _f.sent();
                    _c = testing_1.expect;
                    return [4 /*yield*/, free.find({ type: 'Text', text: 'Skills run' })];
                case 12:
                    _c.apply(void 0, [_f.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, free.find({ type: 'Text', text: '  tdd' })];
                case 13:
                    _d.apply(void 0, [_f.sent()]).toBeDefined();
                    _e = testing_1.expect;
                    return [4 /*yield*/, free.find({ key: 'allow' })];
                case 14:
                    _e.apply(void 0, [_f.sent()]).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": the board lists open tasks first, marks the open one and switches on a press"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, ui, _a, rows, _b, _c, _d, _e;
        var _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    ran = mockEngine(on);
                    (0, fake_1.fakeRepo)(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Old work'))];
                case 1:
                    _h.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('done'))];
                case 2:
                    _h.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry checkout'))];
                case 3:
                    _h.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
                case 4:
                    _h.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-checkout/spec.md', content: 'x' })];
                case 5:
                    _h.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-board', props: pane })];
                case 6:
                    ui = _h.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'new' })];
                case 7:
                    _a.apply(void 0, [(_f = (_h.sent())) === null || _f === void 0 ? void 0 : _f.props]).toMatchObject({ label: 'New task', hotkey: 'n' });
                    return [4 /*yield*/, ui.findAll({ type: 'Button', text: /switch|Retry checkout|Old work/ })];
                case 8:
                    rows = _h.sent();
                    (0, testing_1.expect)(rows.map(function (one) { return one.key; })).toEqual(['switch-retry-checkout', 'switch-old-work']);
                    (0, testing_1.expect)(rows.map(function (one) { return one.props.hotkey; })).toEqual([undefined, undefined]);
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: / · next \// })];
                case 9:
                    _b.apply(void 0, [_h.sent()]).toBeDefined();
                    (0, testing_1.expect)((_g = rows[1]) === null || _g === void 0 ? void 0 : _g.props.dimColor).toBe(true);
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: '> ● ' })];
                case 10:
                    _c.apply(void 0, [_h.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: ' waiting' })];
                case 11:
                    _d.apply(void 0, [_h.sent()]).toBeDefined();
                    _e = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: ' Spec · closed' })];
                case 12:
                    _e.apply(void 0, [_h.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.press({ key: 'switch-old-work' })];
                case 13:
                    _h.sent();
                    (0, testing_1.expect)(ran).toEqual(['flow switch old-work']);
                    return [2 /*return*/];
            }
        });
    }); });
};
for (var _i = 0, SURFACES_1 = SURFACES; _i < SURFACES_1.length; _i++) {
    var surface = SURFACES_1[_i];
    _loop_1(surface);
}
