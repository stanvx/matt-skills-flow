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
var flow_1 = require("../hooks/flow");
var quickbar_1 = require("../hooks/quickbar");
var fake_1 = require("./fake");
var props = function (hasSurvey) {
    if (hasSurvey === void 0) { hasSurvey = false; }
    return ({
        hasSurvey: hasSurvey,
        isWorking: false,
        maxRows: 5,
        bodyColumns: 100,
        scroll: { offset: 0, bodyRows: 5 },
        view: {},
    });
};
var engineBand = function (on) { return on('ui.render', function () { return ({ type: 'Box', props: {}, children: [] }); }); };
var texts = function (phrases) { return phrases.map(function (one) { return one.text; }); };
(0, testing_1.test)('the defaults follow the phase', function () {
    var at = function (phase) { return (__assign(__assign({}, (0, flow_1.createTask)('Retry checkout', 0)), { phase: phase })); };
    (0, testing_1.expect)((0, quickbar_1.defaults)(null, 0, 50)).toEqual([]);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('new'), 0, 50))).toEqual([]);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('grill-with-docs'), 0, 50))).toEqual(['continue']);
    // A gate offers the artifact only once one is recorded.
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('to-spec'), 0, 50))).toEqual(['continue']);
    var written = (0, flow_1.recordArtifact)(at('to-spec'), '.scratch/retry-checkout/spec.md', 1);
    (0, testing_1.expect)((0, quickbar_1.defaults)(written, 0, 50)).toEqual([{ text: '/flow doc', label: 'Read the spec', mode: 'send' }]);
    var approved = __assign(__assign({}, written), { log: [{ kind: 'approve', phase: 'to-spec', at: 2 }] });
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(approved, 0, 50))).toEqual(['continue']);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('implement'), 0, 50))).toEqual(['continue', '/code-review', 'run the checks']);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('diagnosing-bugs'), 0, 50))).toEqual(['continue', '/code-review', 'run the checks']);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('pr'), 0, 50))).toEqual([]);
    (0, testing_1.expect)(texts((0, quickbar_1.defaults)(at('implement-spec'), 50, 50))).toEqual(['continue', '/code-review', 'run the checks', '/clear']);
});
(0, testing_1.test)('saved phrases skip the defaults and take the keys the band leaves, nine in all', function () {
    var task = __assign(__assign({}, (0, flow_1.createTask)('Retry checkout', 0)), { phase: 'implement' });
    var saved = Array.from({ length: 9 }, function (_, at) { return ({ text: at === 0 ? 'continue' : "phrase ".concat(at), mode: 'send' }); });
    // The band takes 1 for the next step, then 2 to 4 for the defaults.
    (0, testing_1.expect)((0, quickbar_1.bandKeys)(task, 0, 50)).toBe(4);
    (0, testing_1.expect)(texts((0, quickbar_1.rowOf)(task, saved, 0, 50))).toEqual(['phrase 1', 'phrase 2', 'phrase 3', 'phrase 4', 'phrase 5']);
    (0, testing_1.expect)((0, quickbar_1.rowOf)(null, saved, 0, 50)).toHaveLength(9);
});
(0, testing_1.test)('labels, slash phrases and stored values are read defensively', function () {
    (0, testing_1.expect)((0, quickbar_1.labelOf)({ text: 'explain', mode: 'fill' })).toBe('explain…');
    (0, testing_1.expect)((0, quickbar_1.labelOf)({ text: 'explain', label: 'why', mode: 'send' })).toBe('why');
    (0, testing_1.expect)((0, quickbar_1.labelOf)({ text: 'x'.repeat(40), mode: 'send' })).toHaveLength(28);
    (0, testing_1.expect)((0, quickbar_1.slashOf)('/flow approve')).toEqual({ command: 'flow', args: 'approve' });
    (0, testing_1.expect)((0, quickbar_1.slashOf)('/clear')).toEqual({ command: 'clear', args: '' });
    (0, testing_1.expect)((0, quickbar_1.slashOf)('continue')).toBeUndefined();
    (0, testing_1.expect)((0, quickbar_1.parsePhrases)([{ text: 'a', mode: 'send' }, { text: '', mode: 'send' }, { text: 'b', mode: 'nope' }, 3, null])).toEqual([
        { text: 'a', mode: 'send' },
    ]);
    (0, testing_1.expect)((0, quickbar_1.parsePhrases)('junk')).toEqual([]);
});
(0, testing_1.test)('add takes flags before the text and refuses bad input', function () {
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('--fill --label "Why" explain why')).toEqual({ text: 'explain why', mode: 'fill', label: 'Why' });
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('--label ok /retro')).toEqual({ text: '/retro', mode: 'send', label: 'ok' });
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('')).toBe('Nothing to save.');
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('--fill')).toBe('Nothing to save.');
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('--label')).toBe('--label needs a label.');
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('--wat x')).toBe('--wat is not an option.');
    (0, testing_1.expect)((0, quickbar_1.parseAdd)('x'.repeat(501))).toContain('under 500');
    (0, testing_1.expect)((0, quickbar_1.parseAdd)("--label ".concat('l'.repeat(25), " x"))).toContain('under 24');
    (0, testing_1.expect)((0, quickbar_1.barCommand)(Array.from({ length: 9 }, function (_, at) { return ({ text: "p".concat(at), mode: 'send' }); }), 'add more').text).toContain('Already 9');
});
var _loop_1 = function (surface) {
    // The engine's own AbovePrompt draws nothing, so the bottom of the chain is an empty box.
    var mounts = 0;
    var mountBar = function ($, survey) {
        if (survey === void 0) { survey = false; }
        return $.ui.mount({ plugin: 'flow', surface: surface, component: 'AbovePrompt', requestId: "bar-".concat((mounts += 1)), props: props(survey) });
    };
    var labels = function (ui) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ui.findAll({ type: 'Button' })];
                case 1: return [2 /*return*/, (_a.sent())
                        .filter(function (one) { var _a; return (_a = one.key) === null || _a === void 0 ? void 0 : _a.startsWith('bar-'); })
                        .map(function (one) { return "".concat(one.props.hotkey, " ").concat(one.props.label); })];
            }
        });
    }); };
    (0, testing_1.test)("".concat(surface, ": the band's keys follow the phase, then the saved phrases"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var empty, _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    (0, fake_1.fakeRepo)(on);
                    engineBand(on);
                    return [4 /*yield*/, mountBar($)];
                case 1:
                    empty = _k.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, labels(empty)];
                case 2:
                    _a.apply(void 0, [_k.sent()]).toEqual([]);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
                case 3:
                    _k.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
                case 4:
                    _k.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add --fill --label Why explain why'))
                        // 1 runs the next step until a gate has something to read.
                    ];
                case 5:
                    _k.sent();
                    // 1 runs the next step until a gate has something to read.
                    _b = testing_1.expect;
                    _c = labels;
                    return [4 /*yield*/, mountBar($)];
                case 6: return [4 /*yield*/, _c.apply(void 0, [_k.sent()])];
                case 7:
                    // 1 runs the next step until a gate has something to read.
                    _b.apply(void 0, [_k.sent()]).toEqual(['2 continue', '3 Why…']);
                    return [4 /*yield*/, $.tool.call({ tool: 'Write', file_path: '/repo/.scratch/retry-failed-checkout-payments/spec.md', content: 'x' })];
                case 8:
                    _k.sent();
                    _d = testing_1.expect;
                    _e = labels;
                    return [4 /*yield*/, mountBar($)];
                case 9: return [4 /*yield*/, _e.apply(void 0, [_k.sent()])];
                case 10:
                    _d.apply(void 0, [_k.sent()]).toEqual(['1 Read the spec', '2 Why…']);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
                case 11:
                    _k.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'implement', text: 'go' })];
                case 12:
                    _k.sent();
                    _f = testing_1.expect;
                    _g = labels;
                    return [4 /*yield*/, mountBar($)];
                case 13: return [4 /*yield*/, _g.apply(void 0, [_k.sent()])];
                case 14:
                    _f.apply(void 0, [_k.sent()]).toEqual(['2 continue', '3 /code-review', '4 run the checks', '5 Why…']);
                    _h = testing_1.expect;
                    _j = labels;
                    return [4 /*yield*/, mountBar($, true)];
                case 15: return [4 /*yield*/, _j.apply(void 0, [_k.sent()])];
                case 16:
                    _h.apply(void 0, [_k.sent()]).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": /clear joins the row once the context is full"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, fake_1.fakeRepo)(on, 80);
                    engineBand(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'pr', text: 'pr' })];
                case 2:
                    _c.sent();
                    _a = testing_1.expect;
                    _b = labels;
                    return [4 /*yield*/, mountBar($)];
                case 3: return [4 /*yield*/, _b.apply(void 0, [_c.sent()])];
                case 4:
                    _a.apply(void 0, [_c.sent()]).toEqual(['2 /clear']);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("".concat(surface, ": a press sends prose, runs a slash command, or fills the prompt"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ran, submitted, filled, clock, ui;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ran = [];
                    submitted = [];
                    filled = [];
                    on('command.list', function () { return ({
                        value: [{ name: 'mattpocock-skills:code-review', description: 'review', source: 'plugin' }],
                    }); });
                    on('command.run', function (_, e) {
                        ran.push({ command: e.command, args: e.args });
                        return { text: '' };
                    });
                    on('prompt.submit', function (_, e) {
                        submitted.push(e);
                        return { text: e.text };
                    });
                    on('prompt.read', function () { return ({ value: { text: 'half a thought', cursor: 14 } }); });
                    on('prompt.fill', function (_, e) {
                        filled.push(e);
                        return { isFilled: true };
                    });
                    clock = (0, fake_1.fakeRepo)(on).clock;
                    engineBand(on);
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, $.skill.prompt({ skill: 'implement', text: 'go' })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add --fill --label Why explain why'))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add /flow doc'))];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, mountBar($)];
                case 5:
                    ui = _a.sent();
                    ran.length = 0;
                    return [4 /*yield*/, ui.press({ key: 'bar-2' })];
                case 6:
                    _a.sent();
                    (0, testing_1.expect)(submitted).toEqual([]);
                    return [4 /*yield*/, clock.advance(0)];
                case 7:
                    _a.sent();
                    (0, testing_1.expect)(submitted.map(function (one) { return one.text; })).toEqual(['continue']);
                    return [4 /*yield*/, ui.press({ key: 'bar-3' })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, clock.advance(0)];
                case 9:
                    _a.sent();
                    (0, testing_1.expect)(ran).toEqual([{ command: 'mattpocock-skills:code-review', args: '' }]);
                    return [4 /*yield*/, ui.press({ key: 'bar-6' })];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, clock.advance(0)];
                case 11:
                    _a.sent();
                    (0, testing_1.expect)(ran.at(-1)).toEqual({ command: 'flow', args: 'doc' });
                    return [4 /*yield*/, ui.press({ key: 'bar-5' })];
                case 12:
                    _a.sent();
                    (0, testing_1.expect)(filled).toMatchObject([{ text: 'explain why half a thought', mode: 'replace' }]);
                    (0, testing_1.expect)(submitted).toHaveLength(1);
                    return [2 /*return*/];
            }
        });
    }); });
};
for (var _i = 0, _a = ['terminal', 'desktop']; _i < _a.length; _i++) {
    var surface = _a[_i];
    _loop_1(surface);
}
(0, testing_1.test)('/flow bar adds, lists, removes and clears through the store', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                (0, fake_1.fakeRepo)(on);
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar'))];
            case 1:
                _a.apply(void 0, [(_p.sent()).text]).toContain('No saved phrases.');
                _b = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add /retro'))];
            case 2:
                _b.apply(void 0, [(_p.sent()).text]).toBe('Saved 1: /retro');
                _c = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add --fill --label Why explain why'))];
            case 3:
                _c.apply(void 0, [(_p.sent()).text]).toBe('Saved 2: explain why');
                _d = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add /retro'))];
            case 4:
                _d.apply(void 0, [(_p.sent()).text]).toBe('Already saved: /retro');
                _e = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar add'))];
            case 5:
                _e.apply(void 0, [(_p.sent()).text]).toContain('Nothing to save.');
                _f = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar'))];
            case 6:
                _f.apply(void 0, [(_p.sent()).text]).toBe('1. /retro\n2. explain why  (fill)  as "Why"');
                _g = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar rm 3'))];
            case 7:
                _g.apply(void 0, [(_p.sent()).text]).toContain('No phrase 3');
                _h = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar rm x'))];
            case 8:
                _h.apply(void 0, [(_p.sent()).text]).toContain('No phrase x');
                _j = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar rm 1'))];
            case 9:
                _j.apply(void 0, [(_p.sent()).text]).toBe('Removed 1: /retro');
                _k = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar'))];
            case 10:
                _k.apply(void 0, [(_p.sent()).text]).toBe('1. explain why  (fill)  as "Why"');
                _l = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar wat'))];
            case 11:
                _l.apply(void 0, [(_p.sent()).text]).toContain('Usage: /flow bar');
                _m = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar clear'))];
            case 12:
                _m.apply(void 0, [(_p.sent()).text]).toBe('Removed 1 phrase.');
                _o = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('bar clear'))];
            case 13:
                _o.apply(void 0, [(_p.sent()).text]).toBe('No saved phrases.');
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the other /flow verbs still reach the main command', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                (0, fake_1.fakeRepo)(on);
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 1:
                _a.apply(void 0, [(_b.sent()).text]).toContain('Opened');
                return [2 /*return*/];
        }
    });
}); });
