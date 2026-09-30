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
exports.registerUi = exports.commandLine = exports.RAIL = exports.BOARD = void 0;
var flow_1 = require("./flow");
var board_1 = require("./board");
var flows_1 = require("./flows");
var status_1 = require("./status");
var quickbar_1 = require("./quickbar");
var strip_1 = require("./strip");
var ui_board_1 = require("./ui-board");
var ui_pane_1 = require("./ui-pane");
var status_2 = require("./status");
Object.defineProperty(exports, "BOARD", { enumerable: true, get: function () { return status_2.BOARD; } });
Object.defineProperty(exports, "RAIL", { enumerable: true, get: function () { return status_2.RAIL; } });
Object.defineProperty(exports, "commandLine", { enumerable: true, get: function () { return status_2.commandLine; } });
var current = { plugin: 'flow', key: 'task' };
var busy = { plugin: 'flow', key: 'busy' };
var registerUi = function (on, clearAt) {
    // Busy follows the main loop's turns; a subagent's turn ends without a start.
    on('turn.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.state.set(busy, true)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, next(e)];
            }
        });
    }); });
    on('turn.complete', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(e.agentId === undefined)) return [3 /*break*/, 2];
                    return [4 /*yield*/, $.state.set(busy, false)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, next(e)];
            }
        });
    }); });
    // The band: a framed panel (the workflow, the task and its status; the stages; the next step and
    // the phase's buttons), then the phrases saved with /flow bar; one line where the bottom slot has
    // too few rows for the panel, and only the saved phrases while no task is open.
    on('ui.render', { component: 'AbovePrompt' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var task, percent, _a, saved, _b, _c, _d, below, _e, Box, Button, Text, press, phraseButtons, savedRow, status, _f, _g, step, segments, rows, why, gate, primary, buttons;
        var _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    if (e.props.hasSurvey) {
                        return [2 /*return*/, next(e)];
                    }
                    return [4 /*yield*/, $.state.get(current)];
                case 1:
                    task = (_h = (_l.sent()).value) !== null && _h !== void 0 ? _h : null;
                    if (!(task === null)) return [3 /*break*/, 2];
                    _a = 0;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, $.session.usage()];
                case 3:
                    _a = ((_j = (_l.sent()).context.percent) !== null && _j !== void 0 ? _j : 0);
                    _l.label = 4;
                case 4:
                    percent = _a;
                    _b = quickbar_1.rowOf;
                    _c = [task];
                    _d = quickbar_1.parsePhrases;
                    return [4 /*yield*/, $.store.get(quickbar_1.BAR_KEY)];
                case 5:
                    saved = _b.apply(void 0, _c.concat([_d.apply(void 0, [_l.sent()]), percent, clearAt]));
                    if (task === null && saved.length === 0) {
                        return [2 /*return*/, next(e)];
                    }
                    return [4 /*yield*/, next(e)];
                case 6:
                    below = _l.sent();
                    _e = $.ui.resolve(e), Box = _e.Box, Button = _e.Button, Text = _e.Text;
                    press = function (phrase) { return __awaiter(void 0, void 0, void 0, function () {
                        var draft, slash;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!(phrase.mode === 'fill')) return [3 /*break*/, 3];
                                    return [4 /*yield*/, $.prompt.read()];
                                case 1:
                                    draft = _a.sent();
                                    return [4 /*yield*/, $.prompt.fill({ text: "".concat(phrase.text, " ").concat(draft.text), mode: 'replace' })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                                case 3:
                                    slash = (0, quickbar_1.slashOf)(phrase.text);
                                    if (slash === undefined) {
                                        $.clock.after(0, function () { return void $.prompt.submit({ text: phrase.text }); });
                                        return [2 /*return*/];
                                    }
                                    $.clock.after(0, function () {
                                        void (function () { return __awaiter(void 0, void 0, void 0, function () {
                                            var known, found;
                                            var _a, _b;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0: return [4 /*yield*/, $.command.list().catch(function () { return []; })];
                                                    case 1:
                                                        known = _c.sent();
                                                        found = (_a = known.find(function (one) { return one.name === slash.command; })) !== null && _a !== void 0 ? _a : known.find(function (one) { return (0, flow_1.skillName)(one.name) === slash.command; });
                                                        return [4 /*yield*/, $.command.run({ command: (_b = found === null || found === void 0 ? void 0 : found.name) !== null && _b !== void 0 ? _b : slash.command, args: slash.args })];
                                                    case 2:
                                                        _c.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })().catch(function () { return $.ui.toast("/".concat(slash.command, " did not run")); });
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    phraseButtons = function (phrases, first, plain) {
                        if (plain === void 0) { plain = true; }
                        return phrases.map(function (phrase, at) { return (<Button key={"bar-".concat(first + at)} label={(0, quickbar_1.labelOf)(phrase)} hotkey={String(first + at)} {...(plain ? { plain: true } : {})} onPress={function () { return press(phrase); }}/>); });
                    };
                    savedRow = saved.length === 0 ? null : (<Box flexWrap="wrap" columnGap={2}>
          {phraseButtons(saved, (0, quickbar_1.bandKeys)(task, percent, clearAt) + 1)}
        </Box>);
                    if (task === null) {
                        return [2 /*return*/, (<Box flexDirection="column">
          {below}
          {savedRow}
        </Box>)];
                    }
                    _f = flow_1.statusOf;
                    _g = [task];
                    return [4 /*yield*/, $.state.get(busy)];
                case 7:
                    status = _f.apply(void 0, _g.concat([(_k = (_l.sent()).value) !== null && _k !== void 0 ? _k : false]));
                    step = (0, flow_1.nextAction)(task);
                    segments = (0, strip_1.segmentsOf)((0, board_1.railView)(task));
                    rows = (0, strip_1.stripChips)(segments, e.props.bodyColumns - 4);
                    why = percent >= clearAt ? (<Text color="yellow">{" context ".concat(Math.round(percent), "%: /clear first, the task survives it")}</Text>) : (<Text dimColor>{" ".concat(step.why)}</Text>);
                    gate = (0, flow_1.isWaiting)(task);
                    primary = (<Button key="next" label={(0, status_1.commandLine)(task)} hotkey={gate ? 'n' : '1'} variant="primary" onPress={function () { return $.flow.run(); }}/>);
                    buttons = phraseButtons((0, quickbar_1.defaults)(task, percent, clearAt), gate ? 1 : 2, false);
                    if (e.props.maxRows < (0, status_1.bandRows)(rows.length)) {
                        return [2 /*return*/, (<Box flexDirection="column">
          <Box flexWrap="wrap">
            <Text dimColor>flow · </Text>
            <Text inverse>{" ".concat((0, status_1.badgeText)(flows_1.FLOWS[task.flow].label, task), " ")}</Text>
            <Text> </Text>
            {(0, strip_1.compactChips)(segments).map(function (chip) { return (<Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                {chip.text}
              </Text>); })}
            <Text dimColor>{" ".concat(task.phase === 'new' ? 'not started' : (0, flows_1.stageLabel)(task.phase), " \u00B7 ")}</Text>
            <Text {...status_1.statusLook[status]}>{flows_1.STATUS_LABEL[status]}</Text>
            <Text> </Text>
            {primary}
            {why}
            {buttons.length > 0 && (<Box columnGap={2} marginLeft={2}>
                {buttons}
              </Box>)}
          </Box>
          {below}
          {savedRow}
        </Box>)];
                    }
                    return [2 /*return*/, (<Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" {...status_1.STATUS_BORDER[status]} paddingX={1}>
          <Box justifyContent="space-between">
            <Box flexShrink={1}>
              <Text backgroundColor={status_1.FLOW_COLOR[task.flow]} color="black" bold>
                {" ".concat((0, status_1.badgeText)(flows_1.FLOWS[task.flow].label, task).toUpperCase(), " ")}
              </Text>
              <Text bold wrap="truncate-end">{"  ".concat(task.title)}</Text>
            </Box>
            <Text {...status_1.statusLook[status]}>{"  ".concat(status_1.STATUS_GLYPH[status], " ").concat(flows_1.STATUS_LABEL[status])}</Text>
          </Box>
          {rows.length === 0 ? (<Text dimColor>{"Freeform: ".concat(task.history.length, " skill runs so far")}</Text>) : (rows.map(function (row) { return (<Box>
                {row.map(function (chip) { return (<Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                    {chip.text}
                  </Text>); })}
              </Box>); }))}
          <Box flexWrap="wrap" justifyContent="space-between" columnGap={2}>
            <Box flexShrink={1}>
              {primary}
              {why}
            </Box>
            {buttons.length > 0 && <Box columnGap={2}>{buttons}</Box>}
          </Box>
        </Box>
        {below}
        {savedRow}
      </Box>)];
            }
        });
    }); });
    (0, ui_pane_1.registerPane)(on);
    (0, ui_board_1.registerBoard)(on);
};
exports.registerUi = registerUi;
