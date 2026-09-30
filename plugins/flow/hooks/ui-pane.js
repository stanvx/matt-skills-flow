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
exports.registerPane = void 0;
var board_1 = require("./board");
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var trail_1 = require("./trail");
var status_1 = require("./status");
var strip_1 = require("./strip");
// The validator lists state reads per file, so each file spells its reference.
var current = { plugin: 'flow', key: 'task' };
var busy = { plugin: 'flow', key: 'busy' };
var registerPane = function (on) {
    on('ui.render', { component: 'Pane', requestId: status_1.RAIL }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var task, isBusy, _a, Box, Button, Text, status, step, line, stops, ci, recent, isOneLine, segments, sessions, strip;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, $.state.get(current)];
                case 1:
                    task = (_b = (_d.sent()).value) !== null && _b !== void 0 ? _b : null;
                    return [4 /*yield*/, $.state.get(busy)];
                case 2:
                    isBusy = (_c = (_d.sent()).value) !== null && _c !== void 0 ? _c : false;
                    _a = $.ui.resolve(e), Box = _a.Box, Button = _a.Button, Text = _a.Text;
                    if (task === null) {
                        return [2 /*return*/, (<Box flexDirection="column">
          <Text bold>No open task</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>1. /flow new opens the new-task dialog (or {'/flow new <what> [--workflow ...]'})</Text>
            <Text>2. Pick a workflow: {flows_1.FLOW_NAMES.map(function (flow) { return flows_1.FLOWS[flow].label; }).join(', ')}</Text>
            <Text>3. Press n to run each stage; gates wait for /flow approve</Text>
          </Box>
          <Text dimColor>/flow board lists every task</Text>
          <Box marginTop={1}>
            <Button key="new" label="New task" hotkey="n" variant="primary" onPress={function () { return $.command.run({ command: 'flow', args: 'new' }); }}/>
          </Box>
        </Box>)];
                    }
                    status = (0, flow_1.statusOf)(task, isBusy);
                    step = (0, flow_1.nextAction)(task);
                    line = (0, status_1.commandLine)(task);
                    stops = (0, board_1.railView)(task);
                    ci = task.log.filter(function (one) { return one.kind === 'ci'; }).at(-1);
                    recent = (0, trail_1.timeline)(task).slice(-5);
                    isOneLine = (0, status_1.fitsOneLine)(e.props.bodyColumns, line, step.why);
                    segments = (0, strip_1.segmentsOf)(stops);
                    sessions = task.history.filter(function (one) { return one.skill === 'wayfinder-clear'; }).length;
                    strip = (function () {
                        if (segments.length === 0) {
                            return null;
                        }
                        if (e.surface === 'terminal') {
                            return (<Box flexDirection="column" marginTop={1}>
            {(0, strip_1.stripChips)(segments, e.props.bodyColumns).map(function (row) { return (<Box>
                {row.map(function (chip) { return (<Text color={chip.color} bold={chip.bold} dimColor={chip.dimColor}>
                    {chip.text}
                  </Text>); })}
              </Box>); })}
          </Box>);
                        }
                        var Svg = $.ui.resolve(e).Svg;
                        return (<Box marginTop={1}>
          <Svg source={(0, strip_1.stripSvg)(segments, e.props.bodyColumns * strip_1.COLUMN_PX)} alt={(0, strip_1.stripAlt)(segments)}/>
        </Box>);
                    })();
                    return [2 /*return*/, (<Box flexDirection="column">
        <Box justifyContent="space-between">
          <Box flexShrink={1}>
            <Text inverse bold>{" ".concat(flows_1.FLOWS[task.flow].label, " ")}</Text>
            <Text bold wrap="truncate-end">{" ".concat(task.title)}</Text>
          </Box>
          <Text {...status_1.statusLook[status]}>{" ".concat(flows_1.STATUS_LABEL[status])}</Text>
        </Box>
        <Text dimColor wrap="truncate-end">{(0, status_1.subline)(task)}</Text>
        {strip}

        <Box flexDirection="column" marginTop={1}>
          {task.flow === 'freeform' ? (<Box flexDirection="column">
              <Text bold>Skills run</Text>
              {(0, status_1.skillsRun)(task).length === 0 && <Text dimColor>none yet</Text>}
              {(0, status_1.skillsRun)(task).map(function (skill) { return (<Text dimColor>{"  ".concat(skill)}</Text>); })}
            </Box>) : (stops.map(function (stop, at) { return (<Box flexDirection="column">
                <Box>
                  <Text bold={stop.state === 'now'} color={stop.state === 'now' ? status_1.ACCENT : undefined} dimColor={stop.state !== 'now'}>{"".concat(at + 1, ". ").concat(status_1.glyph[stop.state], " ").concat((0, flows_1.stageLabel)(stop.stage))}</Text>
                  <Text dimColor>{"  /".concat((0, flows_1.commandOf)(stop.stage))}</Text>
                  {(0, status_1.gateText)(stop.gate) !== undefined && (<Text color={stop.gate === 'approved' ? 'green' : 'yellow'}>{"  ".concat((0, status_1.gateText)(stop.gate))}</Text>)}
                </Box>
                {stop.stage === 'wayfinder-clear' && sessions > 0 && (<Text dimColor>{"     ".concat(sessions, " ticket session").concat(sessions === 1 ? '' : 's', " so far")}</Text>)}
                {stop.artifacts.map(function (pointer) { return (<Text dimColor>{"     ".concat((0, trail_1.shortPointer)(pointer))}</Text>); })}
              </Box>); }))}
          {task.flow !== 'freeform' && <Text dimColor>{strip_1.LEGEND}</Text>}
          {ci !== undefined && <Text color={ci.ok ? 'green' : 'red'}>{"CI ".concat(ci.ok ? 'passed' : 'failed')}</Text>}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection={isOneLine ? 'row' : 'column'}>
            <Button key="next" label={line} hotkey="n" variant="primary" onPress={function () { return $.flow.run(); }}/>
            <Text dimColor>{isOneLine ? " ".concat(step.why) : step.why}</Text>
          </Box>
          <Box flexWrap="wrap" gap={2}>
            {step.alt !== undefined && (<Button key="alt" label={"".concat(step.alt.label, ": /").concat(step.alt.command)} hotkey="m" onPress={function () { return $.flow.run({ alt: true }); }}/>)}
            {task.artifacts.length > 0 && (<Button key="doc" label="Open artifact" hotkey="o" onPress={function () { return $.command.run({ command: 'flow', args: 'doc' }); }}/>)}
            {(0, flow_1.editGate)(task, 'src') !== undefined && (<Button key="allow" label="Allow edits" hotkey="e" onPress={function () { return $.flow.allow(); }}/>)}
            <Button key="board" label="Board" hotkey="b" onPress={function () { return $.ui.open({ id: status_1.BOARD, title: 'flow board' }); }}/>
          </Box>
        </Box>

        {recent.length > 0 && (<Box flexDirection="column" marginTop={1}>
            <Text bold>Recent activity</Text>
            {recent.map(function (text) { return (<Text dimColor wrap="truncate-end">{text}</Text>); })}
          </Box>)}
        <Box marginTop={1}>
          <Text dimColor>{(0, status_1.keyHints)(task)}</Text>
        </Box>
      </Box>)];
            }
        });
    }); });
};
exports.registerPane = registerPane;
