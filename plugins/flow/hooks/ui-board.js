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
exports.registerBoard = void 0;
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var status_1 = require("./status");
var current = { plugin: 'flow', key: 'task' };
var busy = { plugin: 'flow', key: 'busy' };
var registerBoard = function (on) {
    on('ui.render', { component: 'Pane', requestId: status_1.BOARD }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, Box, Button, Text, open, isBusy, tasks, _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = $.ui.resolve(e), Box = _a.Box, Button = _a.Button, Text = _a.Text;
                    return [4 /*yield*/, $.state.get(current)];
                case 1:
                    open = (_c = (_e.sent()).value) !== null && _c !== void 0 ? _c : null;
                    return [4 /*yield*/, $.state.get(busy)];
                case 2:
                    isBusy = (_d = (_e.sent()).value) !== null && _d !== void 0 ? _d : false;
                    _b = status_1.boardOrder;
                    return [4 /*yield*/, $.flow.all()];
                case 3:
                    tasks = _b.apply(void 0, [_e.sent()]);
                    return [2 /*return*/, (<Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>Tasks</Text>
          <Button key="new" label="New task" hotkey="n" variant="primary" onPress={function () { return $.command.run({ command: 'flow', args: 'new' }); }}/>
        </Box>
        {tasks.length === 0 && (<Box flexDirection="column">
            <Text dimColor>No tasks yet. Three steps to your first:</Text>
            {status_1.WALKTHROUGH.map(function (line, at) { return (<Text>{"  ".concat(at + 1, ". ").concat(line)}</Text>); })}
          </Box>)}
        {tasks.map(function (task) {
                                var isOpen = task.slug === (open === null || open === void 0 ? void 0 : open.slug);
                                var status = (0, flow_1.statusOf)(task, isOpen && isBusy);
                                var isClosed = task.closedAt !== undefined;
                                return (<Box>
              <Text {...status_1.statusLook[status]}>{"".concat(isOpen ? '>' : ' ', " \u25CF ")}</Text>
              <Button key={"switch-".concat(task.slug)} label={task.title} plain dimColor={isClosed} onPress={function () { return $.command.run({ command: 'flow', args: "switch ".concat(task.slug) }); }}/>
              <Text dimColor>{" ".concat(flows_1.FLOWS[task.flow].label, " \u00B7 ").concat(isClosed ? 'closed' : task.phase)}</Text>
              {status === 'waiting' && <Text color="yellow">{' waiting'}</Text>}
              {!isClosed && <Text dimColor>{" \u00B7 next ".concat((0, status_1.commandLine)(task))}</Text>}
            </Box>);
                            })}
      </Box>)];
            }
        });
    }); });
};
exports.registerBoard = registerBoard;
