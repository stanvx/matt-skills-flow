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
exports.registerDialog = exports.DIALOG = void 0;
// The new-task dialog: /flow new with no text opens it as a pane. The fields
// live in the `draft` state; draft.ts holds what typing and picking do to it.
var claude_code_1 = require("claude-code");
var draft_1 = require("./draft");
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var strip_1 = require("./strip");
var ui_1 = require("./ui");
// The validator lists state reads per file, so each file spells its reference.
var draft = { plugin: 'flow', key: 'draft' };
exports.DIALOG = 'flow-new';
// Body rows the form wants inline above the prompt.
var ROWS = 24;
// Below this many columns the five workflow buttons wrap to two rows.
var NARROW = 60;
var WORKTREE_WHY = {
    never: 'Edits happen in this checkout.',
    now: 'The task gets its own git worktree, so this checkout stays clean.',
};
var registerDialog = function (on) {
    // No text and no flags opens the form; a surface without fields, and anything else, is the main hook's.
    on('command.run', { command: 'flow' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, opened;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = e.args.trim() !== 'new';
                    if (_a) return [3 /*break*/, 2];
                    return [4 /*yield*/, $.session.surfaces()];
                case 1:
                    _a = !(_b.sent()).some(function (surface) { return surface !== 'mobile'; });
                    _b.label = 2;
                case 2:
                    if (_a) {
                        return [2 /*return*/, next(e)];
                    }
                    return [4 /*yield*/, $.state.set(draft, (0, draft_1.blankDraft)())];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, $.ui.open({ id: exports.DIALOG, title: 'New task', focus: true, closeOnEscape: true, holdToasts: true, rows: ROWS })];
                case 4:
                    opened = _b.sent();
                    return [2 /*return*/, { text: opened.isPlaced ? 'New task dialog opened.' : "Could not seat the new task dialog: ".concat(opened.reason) }];
            }
        });
    }); });
    // Esc and the close mark end the draft too.
    on('ui.close', { id: exports.DIALOG }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var closed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    closed = _a.sent();
                    return [4 /*yield*/, $.state.set(draft, null)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, closed];
            }
        });
    }); });
    on('ui.render', { component: 'Pane', requestId: exports.DIALOG }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var current, Text_1, _a, Box, Button, Input, Select, Text, d, session, why, stages, svgOf, edit, focus, close, submitWhat, create, flowButtons, flowRows, worktree;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, $.state.get(draft)];
                case 1:
                    current = (_b = (_c.sent()).value) !== null && _b !== void 0 ? _b : null;
                    if (e.surface === 'mobile') {
                        Text_1 = $.ui.resolve(e).Text;
                        return [2 /*return*/, <Text_1 dimColor>The new task dialog needs a field to type in. Use /flow new &lt;what are we doing&gt;.</Text_1>];
                    }
                    _a = $.ui.resolve(e), Box = _a.Box, Button = _a.Button, Input = _a.Input, Select = _a.Select, Text = _a.Text;
                    if (current === null) {
                        return [2 /*return*/, <Text dimColor>Closed. /flow new opens it again.</Text>];
                    }
                    d = current;
                    return [4 /*yield*/, $.session.model().catch(function () { return ''; })];
                case 2:
                    session = _c.sent();
                    why = (0, draft_1.blocker)(d);
                    stages = (0, draft_1.preview)(d);
                    svgOf = function (segments) {
                        if (e.surface === 'terminal') {
                            return null;
                        }
                        var Svg = $.ui.resolve(e).Svg;
                        return <Svg source={(0, strip_1.stripSvg)(segments, e.props.bodyColumns * strip_1.COLUMN_PX)} alt={(0, strip_1.stripAlt)(segments)}/>;
                    };
                    edit = function (change) { return (0, claude_code_1.update)($, draft, function (from) { return (from ? change(from) : null); }); };
                    focus = function (key) { return $.ui.focus({ requestId: exports.DIALOG, key: key }).catch(function () { return undefined; }); };
                    close = function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, $.ui.close({ id: exports.DIALOG })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, $.state.set(draft, null)];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    submitWhat = function (text) { return __awaiter(void 0, void 0, void 0, function () {
                        var label, flow;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, focus('name')];
                                case 1:
                                    _a.sent();
                                    if (text.trim() === '' || (0, draft_1.githubRef)(text) !== undefined || d.isFlowPicked) {
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, $.model.classify(text, draft_1.flowLabels, { model: 'haiku' }).catch(function () { return undefined; })];
                                case 2:
                                    label = _a.sent();
                                    flow = (0, draft_1.flowOfLabel)(label);
                                    if (!(flow !== undefined)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, edit(function (from) { return (0, draft_1.guessed)(from, flow); })];
                                case 3:
                                    _a.sent();
                                    _a.label = 4;
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); };
                    create = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var now, ref, issue, cwd, ran, read, task;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, $.state.get(draft)];
                                case 1:
                                    now = (_a = (_b.sent()).value) !== null && _a !== void 0 ? _a : null;
                                    if (now === null || (0, draft_1.blocker)(now) !== undefined) {
                                        return [2 /*return*/];
                                    }
                                    ref = (0, draft_1.githubRef)(now.text);
                                    if (!(ref !== undefined)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, $.session.root()];
                                case 2:
                                    cwd = _b.sent();
                                    return [4 /*yield*/, $.process
                                            .run(['gh', 'issue', 'view', ref, '--json', 'title,body,url'], { cwd: cwd })
                                            .catch(function (error) { return (error instanceof Error ? error.message : 'gh did not run'); })];
                                case 3:
                                    ran = _b.sent();
                                    read = typeof ran === 'string' ? ran : (0, draft_1.issueOf)(ran);
                                    if (typeof read === 'string') {
                                        $.ui.toast("flow could not read issue ".concat(ref, ": ").concat(read));
                                        return [2 /*return*/];
                                    }
                                    issue = read;
                                    _b.label = 4;
                                case 4: return [4 /*yield*/, close()];
                                case 5:
                                    _b.sent();
                                    return [4 /*yield*/, $.flow.create((0, draft_1.createFrom)(now, issue))];
                                case 6:
                                    task = (_b.sent()).task;
                                    return [4 /*yield*/, $.ui.open({ id: ui_1.RAIL, title: 'flow' })];
                                case 7:
                                    _b.sent();
                                    if (task.phase !== 'new') {
                                        $.ui.toast("Resumed ".concat(task.title, " (").concat(task.phase, ")"));
                                        return [2 /*return*/];
                                    }
                                    $.ui.toast("Opened ".concat(task.title, ": starting /").concat((0, flow_1.nextAction)(task).command));
                                    return [4 /*yield*/, $.flow.run()];
                                case 8:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    flowButtons = flows_1.FLOW_NAMES.map(function (name, at) { return (<Button key={"flow-".concat(name)} label={flows_1.FLOWS[name].label} hotkey={String(at + 1)} variant={d.flow === name ? 'primary' : 'secondary'} onPress={function () { return edit(function (from) { return (0, draft_1.picked)(from, name); }); }}/>); });
                    flowRows = e.props.bodyColumns < NARROW ? [flowButtons.slice(0, 3), flowButtons.slice(3)] : [flowButtons];
                    worktree = function (value, label) { return (<Button key={"worktree-".concat(value)} label={label} hotkey={d.worktree === value ? undefined : 'w'} variant={d.worktree === value ? 'primary' : 'secondary'} onPress={function () { return edit(function (from) { return (__assign(__assign({}, from), { worktree: value })); }); }}/>); };
                    return [2 /*return*/, (<Box flexDirection="column">
        <Text bold>What</Text>
        <Input key="what" autoFocus value={d.text} placeholder="Describe what to build, or paste a GitHub issue URL or #123" submitLabel="name it" onInput={function (text) { return edit(function (from) { return (0, draft_1.typed)(from, text); }); }} onSubmit={function (text) { return void submitWhat(text); }}/>
        <Text bold>Name</Text>
        <Input key="name" value={d.title} placeholder="A short name for the task" submitLabel="next" onInput={function (title) { return edit(function (from) { return (__assign(__assign({}, from), { title: title })); }); }} onSubmit={function () { return void focus('create'); }}/>
        <Text dimColor>{(0, draft_1.slugPath)(d)}</Text>
        <Text> </Text>
        <Text bold>{"Workflow (1-".concat(flows_1.FLOW_NAMES.length, ")")}</Text>
        {flowRows.map(function (row) { return (<Box gap={1}>{row}</Box>); })}
        <Text dimColor>{"".concat(flows_1.FLOWS[d.flow].blurb).concat(d.isFlowPicked ? '' : ' (guessed from what you typed)')}</Text>
        {stages.length === 0 ? (<Text dimColor>No fixed stages: every skill you run is recorded.</Text>) : e.surface === 'terminal' ? ((0, strip_1.stripChips)(stages, e.props.bodyColumns).map(function (row) { return (<Box>
              {row.map(function (chip) { return (<Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                  {chip.text}
                </Text>); })}
            </Box>); })) : (svgOf(stages))}
        <Text> </Text>
        <Button key="pr" label={"".concat(d.openPr ? '[x]' : '[ ]', " Open a PR when done")} hotkey="p" plain onPress={function () { return edit(function (from) { return (__assign(__assign({}, from), { openPr: !from.openPr })); }); }}/>
        <Text> </Text>
        <Text bold>Worktree (w)</Text>
        <Box gap={1}>
          {worktree('never', 'This checkout')}
          {worktree('now', 'Own worktree')}
        </Box>
        <Text dimColor>{WORKTREE_WHY[d.worktree]}</Text>
        <Text> </Text>
        <Select key="model" label="Model" value={d.model} options={__spreadArray([
                                { value: '', label: session === '' ? 'Session default' : "Session default (".concat(session, ")") }
                            ], flows_1.MODELS.map(function (one) { return ({ value: one.alias, label: one.label }); }), true)} onSelect={function (model) { return edit(function (from) { return (__assign(__assign({}, from), { model: model })); }); }}/>
        <Select key="effort" label="Effort" value={d.effort} options={__spreadArray([{ value: '', label: 'Session default' }], flows_1.EFFORTS.map(function (value) { return ({ value: value }); }), true)} onSelect={function (value) { return edit(function (from) { return (__assign(__assign({}, from), { effort: (0, draft_1.effortOf)(value) })); }); }}/>
        <Text> </Text>
        <Box gap={1}>
          <Button key="cancel" label="Cancel" role="dismiss" onPress={function () { return void close(); }}/>
          <Button key="create" label="Create task" hotkey="c" variant="primary" onPress={function () { return void create(); }}/>
        </Box>
        <Text dimColor>{why !== null && why !== void 0 ? why : 'Tab moves between fields, Esc cancels.'}</Text>
      </Box>)];
            }
        });
    }); });
};
exports.registerDialog = registerDialog;
