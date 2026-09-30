"use strict";
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
var doc_1 = require("../hooks/doc");
var flow_1 = require("../hooks/flow");
var fake_1 = require("./fake");
var DIR = '.scratch/retry-failed-checkout-payments';
var props = { title: 'spec.md', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} };
// A task at the spec gate: notes from the grill, the spec, and an issue link.
var write = function ($, pointer) {
    return $.tool.call({ tool: 'Edit', file_path: "/repo/".concat(pointer), old_string: 'a', new_string: 'b' });
};
var atGate = function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var repo;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Registered first, so it answers before the fake repo's own tool.call.
                on('tool.call', { tool: 'Bash' }, function () { return ({ result: 'ok', text: 'https://github.com/o/r/issues/12\n' }); });
                repo = (0, fake_1.fakeRepo)(on);
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
            case 2:
                _a.sent();
                return [4 /*yield*/, write($, "".concat(DIR, "/notes.md"))];
            case 3:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 4:
                _a.sent();
                return [4 /*yield*/, write($, "".concat(DIR, "/spec.md"))];
            case 5:
                _a.sent();
                return [4 /*yield*/, $.tool.call({ tool: 'Bash', command: 'gh issue create --title x' })];
            case 6:
                _a.sent();
                repo.files.set("/repo/".concat(DIR, "/notes.md"), '# Notes\nthe grill');
                repo.files.set("/repo/".concat(DIR, "/spec.md"), '# Spec\nretry three times');
                return [2 /*return*/, repo];
        }
    });
}); };
(0, testing_1.test)('artifacts are files newest first, and Approve belongs to the gated phase', function () {
    var _a, _b;
    var grilled = (0, flow_1.recordArtifact)((0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs', 1), '.scratch/r/notes.md', 2);
    var specced = (0, flow_1.recordArtifact)((0, flow_1.recordArtifact)((0, flow_1.recordSkill)(grilled, 'to-spec', 3), '.scratch/r/spec.md', 4), 'https://github.com/o/r/issues/3', 5);
    (0, testing_1.expect)((0, doc_1.fileArtifacts)(specced).map(function (one) { return one.pointer; })).toEqual(['.scratch/r/spec.md', '.scratch/r/notes.md']);
    (0, testing_1.expect)((_a = (0, doc_1.pick)(specced, '.scratch/r/notes.md')) === null || _a === void 0 ? void 0 : _a.phase).toBe('grill-with-docs');
    (0, testing_1.expect)((_b = (0, doc_1.pick)(specced, 'gone.md')) === null || _b === void 0 ? void 0 : _b.pointer).toBe('.scratch/r/spec.md');
    (0, testing_1.expect)((0, doc_1.pick)((0, flow_1.createTask)('Retry checkout', 0), null)).toBeUndefined();
    var _c = (0, doc_1.fileArtifacts)(specced), spec = _c[0], notes = _c[1];
    (0, testing_1.expect)(spec && (0, doc_1.canApprove)(specced, spec)).toBe(true);
    (0, testing_1.expect)(notes && (0, doc_1.canApprove)(specced, notes)).toBe(false);
    (0, testing_1.expect)(spec && (0, doc_1.canApprove)((0, flow_1.approvePhase)(specced, 6), spec)).toBe(false);
    (0, testing_1.expect)((0, doc_1.baseName)('.scratch/r/spec.md')).toBe('spec.md');
});
(0, testing_1.test)('a long file is cut at the cap and Revise keeps a typed draft', function () {
    (0, testing_1.expect)((0, doc_1.clip)('a\r\nb\u0007c')).toEqual({ head: 'a\nb c', rest: 0 });
    (0, testing_1.expect)((0, doc_1.clip)('x'.repeat(doc_1.CAP + 25))).toEqual({ head: 'x'.repeat(doc_1.CAP), rest: 25 });
    (0, testing_1.expect)((0, doc_1.clip)("".concat('x'.repeat(doc_1.CAP - 1), "\uD83D\uDE00")).head).toHaveLength(doc_1.CAP - 1);
    (0, testing_1.expect)((0, doc_1.reviseFill)('  ', 'a/spec.md')).toEqual({ text: 'Revise a/spec.md: ', mode: 'replace' });
    (0, testing_1.expect)((0, doc_1.reviseFill)('draft', 'a/spec.md')).toEqual({ text: '\nRevise a/spec.md: ', mode: 'append' });
});
(0, testing_1.test)('/flow doc answers without a task or artifacts, and opens the tab on the latest', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                on('tool.call', { tool: 'Bash' }, function () { return ({ result: 'ok', text: 'https://github.com/o/r/issues/7\n' }); });
                (0, fake_1.fakeRepo)(on);
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc'))];
            case 1:
                _a.apply(void 0, [(_h.sent()).text]).toContain('No open task');
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 2:
                _h.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc'))];
            case 3:
                _b.apply(void 0, [(_h.sent()).text]).toContain('No artifacts yet');
                // Links alone (tickets published as issues) still open the tab.
                return [4 /*yield*/, $.tool.call({ tool: 'Bash', command: 'gh issue create --title x' })];
            case 4:
                // Links alone (tickets published as issues) still open the tab.
                _h.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc'))];
            case 5:
                _c.apply(void 0, [(_h.sent()).text]).toBe('Opened the links.');
                return [4 /*yield*/, write($, "".concat(DIR, "/notes.md"))];
            case 6:
                _h.sent();
                return [4 /*yield*/, write($, "".concat(DIR, "/spec.md"))];
            case 7:
                _h.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc'))];
            case 8:
                _d.apply(void 0, [(_h.sent()).text]).toBe('Opened spec.md (new).');
                _e = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc notes.md'))];
            case 9:
                _e.apply(void 0, [(_h.sent()).text]).toBe('Opened notes.md (new).');
                _f = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc nope.md'))];
            case 10:
                _f.apply(void 0, [(_h.sent()).text]).toContain('No artifact matches nope.md');
                // Other verbs still reach the main command.
                _g = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('done'))];
            case 11:
                // Other verbs still reach the main command.
                _g.apply(void 0, [(_h.sent()).text]).toContain('Closed');
                return [2 /*return*/];
        }
    });
}); });
var _loop_1 = function (surface) {
    (0, testing_1.test)("the tab reads the file and lists the artifacts on ".concat(surface), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, select, _b, _c, _d;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, atGate($, on)];
                case 1:
                    _g.sent();
                    return [4 /*yield*/, $.command.run((0, fake_1.flow)('doc'))];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-doc', props: props })];
                case 3:
                    ui = _g.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Markdown' })];
                case 4:
                    _a.apply(void 0, [(_e = (_g.sent())) === null || _e === void 0 ? void 0 : _e.text]).toBe('# Spec\nretry three times');
                    return [4 /*yield*/, ui.find({ key: 'file' })];
                case 5:
                    select = _g.sent();
                    (0, testing_1.expect)(select === null || select === void 0 ? void 0 : select.props.options).toEqual([
                        { value: "".concat(DIR, "/spec.md"), label: "".concat(DIR.split('/').at(-1), "/spec.md (to-spec)") },
                        { value: "".concat(DIR, "/notes.md"), label: "".concat(DIR.split('/').at(-1), "/notes.md (grill-with-docs)") },
                    ]);
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Link', text: 'issue #12 (to-spec)' })];
                case 6:
                    _b.apply(void 0, [_g.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.select({ key: 'file', value: "".concat(DIR, "/notes.md") })];
                case 7:
                    _g.sent();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Markdown' })];
                case 8:
                    _c.apply(void 0, [(_f = (_g.sent())) === null || _f === void 0 ? void 0 : _f.text]).toBe('# Notes\nthe grill');
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'approve' })];
                case 9:
                    _d.apply(void 0, [_g.sent()]).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("Approve shows only at the unapproved gate and approves on ".concat(surface), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var files, ui, approve, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, atGate($, on)];
                case 1:
                    files = (_c.sent()).files;
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-doc', props: props })];
                case 2:
                    ui = _c.sent();
                    return [4 /*yield*/, ui.find({ key: 'approve' })];
                case 3:
                    approve = _c.sent();
                    (0, testing_1.expect)(approve === null || approve === void 0 ? void 0 : approve.props.label).toBe('Approve spec');
                    (0, testing_1.expect)(approve === null || approve === void 0 ? void 0 : approve.props.variant).toBe('primary');
                    (0, testing_1.expect)(approve === null || approve === void 0 ? void 0 : approve.props.hotkey).toBe('a');
                    return [4 /*yield*/, ui.press({ key: 'approve' })];
                case 4:
                    _c.sent();
                    (0, testing_1.expect)(JSON.parse((_b = files.get("/repo/".concat(DIR, "/task.json"))) !== null && _b !== void 0 ? _b : '{}').log.at(-1).kind).toBe('approve');
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'approve' })];
                case 5:
                    _a.apply(void 0, [_c.sent()]).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("Revise fills the prompt, keeping a typed draft, on ".concat(surface), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var draft, fills, ui;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    draft = '';
                    fills = [];
                    on('prompt.read', function () { return ({ value: { text: draft, cursor: draft.length } }); });
                    on('prompt.fill', function (_, e) {
                        fills.push(e);
                        return { isFilled: true };
                    });
                    return [4 /*yield*/, atGate($, on)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-doc', props: props })];
                case 2:
                    ui = _a.sent();
                    return [4 /*yield*/, ui.press({ key: 'revise' })];
                case 3:
                    _a.sent();
                    draft = 'half typed';
                    return [4 /*yield*/, ui.press({ key: 'revise' })];
                case 4:
                    _a.sent();
                    (0, testing_1.expect)(fills).toMatchObject([
                        { text: "Revise ".concat(DIR, "/spec.md: "), mode: 'replace' },
                        { text: "\nRevise ".concat(DIR, "/spec.md: "), mode: 'append' },
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("a long file is capped and a missing one says why on ".concat(surface), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var files, ui, _a, _b, _c, _d;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, atGate($, on)];
                case 1:
                    files = (_f.sent()).files;
                    files.set("/repo/".concat(DIR, "/spec.md"), 'y'.repeat(doc_1.CAP + 30));
                    return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: surface, component: 'Pane', requestId: 'flow-doc', props: props })];
                case 2:
                    ui = _f.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Markdown' })];
                case 3:
                    _a.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.text]).toHaveLength(doc_1.CAP);
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: "30 more characters in /repo/".concat(DIR, "/spec.md") })];
                case 4:
                    _b.apply(void 0, [_f.sent()]).toBeDefined();
                    files.delete("/repo/".concat(DIR, "/spec.md"));
                    return [4 /*yield*/, ui.select({ key: 'file', value: "".concat(DIR, "/notes.md") })];
                case 5:
                    _f.sent();
                    return [4 /*yield*/, ui.select({ key: 'file', value: "".concat(DIR, "/spec.md") })];
                case 6:
                    _f.sent();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Markdown' })];
                case 7:
                    _c.apply(void 0, [_f.sent()]).toBeUndefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Text', text: /^Could not read .*spec\.md: \S/ })];
                case 8:
                    _d.apply(void 0, [_f.sent()]).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
};
for (var _i = 0, _a = ['terminal', 'desktop']; _i < _a.length; _i++) {
    var surface = _a[_i];
    _loop_1(surface);
}
(0, testing_1.test)('the empty tab says where artifacts come from, and mobile lists files as buttons', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var empty, _a, mobile, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                (0, fake_1.fakeRepo)(on);
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 1:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: 'terminal', component: 'Pane', requestId: 'flow-doc', props: props })];
            case 2:
                empty = _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, empty.find({ type: 'Text', text: 'No artifacts yet.' })];
            case 3:
                _a.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, write($, "".concat(DIR, "/spec.md"))];
            case 4:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'flow', surface: 'mobile', component: 'Pane', requestId: 'flow-doc', props: props })];
            case 5:
                mobile = _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, mobile.find({ key: "file:".concat(DIR, "/spec.md") })];
            case 6:
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, mobile.find({ key: 'file' })];
            case 7:
                _c.apply(void 0, [_d.sent()]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
