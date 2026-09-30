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
exports.registerDoc = exports.EMPTY = exports.reviseFill = exports.clip = exports.canApprove = exports.baseName = exports.match = exports.pick = exports.linkArtifacts = exports.fileArtifacts = exports.CAP = exports.DOC = void 0;
var flow_1 = require("./flow");
var mermaid_1 = require("./mermaid");
var trail_1 = require("./trail");
// The validator lists state reads per file, so each file spells its reference.
var current = { plugin: 'flow', key: 'task' };
var shown = { plugin: 'flow', key: 'doc' };
exports.DOC = 'flow-doc';
/** What one Markdown element takes. */
exports.CAP = 10000;
/** The artifacts that are files under the repo, newest first. */
var fileArtifacts = function (task) {
    return __spreadArray([], task.artifacts, true).reverse()
        .filter(function (one, at, all) { return !one.pointer.startsWith('http') && all.findIndex(function (other) { return other.pointer === one.pointer; }) === at; });
};
exports.fileArtifacts = fileArtifacts;
// ponytail: https only, since a Link refuses the rest; a plain Text row if
// an http issue tracker ever matters.
/** The issue and PR links, newest first. */
var linkArtifacts = function (task) { return __spreadArray([], task.artifacts, true).reverse().filter(function (one) { return one.pointer.startsWith('https://'); }); };
exports.linkArtifacts = linkArtifacts;
/** The artifact the tab shows: the one `doc` names, else the latest file. */
var pick = function (task, doc) {
    var _a;
    var files = (0, exports.fileArtifacts)(task);
    return (_a = files.find(function (one) { return one.pointer === doc; })) !== null && _a !== void 0 ? _a : files[0];
};
exports.pick = pick;
/** The artifact `/flow doc <text>` means: its pointer, or a file name ending it. */
var match = function (task, text) {
    return (0, exports.fileArtifacts)(task).find(function (one) { return one.pointer === text || one.pointer.endsWith("/".concat(text)); });
};
exports.match = match;
var baseName = function (pointer) { var _a; return (_a = pointer.split('/').at(-1)) !== null && _a !== void 0 ? _a : pointer; };
exports.baseName = baseName;
/** Approve shows only at an unapproved gate, for the artifact that phase made. */
var canApprove = function (task, artifact) {
    return task.phase in flow_1.GATED && !(0, flow_1.isApproved)(task) && artifact.phase === task.phase;
};
exports.canApprove = canApprove;
/** A file as Markdown takes it: tabs and newlines the only control characters, at most CAP long. */
var clip = function (raw) {
    var text = raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ');
    var cut = text.slice(0, exports.CAP);
    // A high surrogate cut off from its pair would be drawn as U+FFFD.
    var head = /[\ud800-\udbff]$/.test(cut) ? cut.slice(0, -1) : cut;
    return { head: head, rest: text.length - head.length };
};
exports.clip = clip;
/** The prompt text Revise writes: replaces an empty draft, follows a typed one. */
var reviseFill = function (draft, pointer) {
    return draft.trim() === ''
        ? { text: "Revise ".concat(pointer, ": "), mode: 'replace' }
        : { text: "\nRevise ".concat(pointer, ": "), mode: 'append' };
};
exports.reviseFill = reviseFill;
exports.EMPTY = 'No artifacts yet. Stages write them under .scratch/<slug>/ and gh issue/pr create links land here too.';
var registerDoc = function (on) {
    // /flow doc [pointer]: opens the tab on an artifact, the latest by default.
    on('command.run', { command: 'flow' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, verb, _c, rest, task, want, artifact, isPlaced_1, isPlaced;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = (_d = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim())) !== null && _d !== void 0 ? _d : [], _b = _a[1], verb = _b === void 0 ? '' : _b, _c = _a[2], rest = _c === void 0 ? '' : _c;
                    if (verb !== 'doc') {
                        return [2 /*return*/, next(e)];
                    }
                    return [4 /*yield*/, $.flow.task()];
                case 1:
                    task = _e.sent();
                    if (task === null) {
                        return [2 /*return*/, { text: 'No open task. /flow new <what are we doing>' }];
                    }
                    want = rest.trim();
                    artifact = want === '' ? (0, exports.pick)(task, null) : (0, exports.match)(task, want);
                    if (!(artifact === undefined)) return [3 /*break*/, 5];
                    if (!(want === '' && (0, exports.linkArtifacts)(task).length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, $.state.set(shown, null)];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, $.ui.open({ id: exports.DOC, title: 'links' })];
                case 3:
                    isPlaced_1 = (_e.sent()).isPlaced;
                    return [2 /*return*/, { text: isPlaced_1 ? 'Opened the links.' : 'Could not place the links.' }];
                case 4: return [2 /*return*/, { text: want === '' ? exports.EMPTY : "No artifact matches ".concat(want, ". /flow doc lists the latest.") }];
                case 5: return [4 /*yield*/, $.state.set(shown, artifact.pointer)];
                case 6:
                    _e.sent();
                    return [4 /*yield*/, $.ui.open({ id: exports.DOC, title: (0, exports.baseName)(artifact.pointer) })];
                case 7:
                    isPlaced = (_e.sent()).isPlaced;
                    return [2 /*return*/, { text: "".concat(isPlaced ? 'Opened' : 'Could not place', " ").concat((0, exports.baseName)(artifact.pointer), " (").concat(artifact.phase, ").") }];
            }
        });
    }); });
    on('ui.render', { component: 'Pane', requestId: exports.DOC }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, Box, Button, Link, Markdown, Text, Select, task, files, links, artifact, _b, _c, root, path, read, body, open, label;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _a = $.ui.resolve(e), Box = _a.Box, Button = _a.Button, Link = _a.Link, Markdown = _a.Markdown, Text = _a.Text;
                    Select = e.surface === 'mobile' ? undefined : $.ui.resolve(e).Select;
                    return [4 /*yield*/, $.state.get(current)];
                case 1:
                    task = (_d = (_f.sent()).value) !== null && _d !== void 0 ? _d : null;
                    if (task === null) {
                        return [2 /*return*/, <Text dimColor>No open task. /flow new &lt;what are we doing&gt;</Text>];
                    }
                    files = (0, exports.fileArtifacts)(task);
                    links = (0, exports.linkArtifacts)(task);
                    _b = exports.pick;
                    _c = [task];
                    return [4 /*yield*/, $.state.get(shown)];
                case 2:
                    artifact = _b.apply(void 0, _c.concat([(_e = (_f.sent()).value) !== null && _e !== void 0 ? _e : null]));
                    if (artifact === undefined) {
                        return [2 /*return*/, (<Box flexDirection="column">
          {links.length === 0 && <Text dimColor>{exports.EMPTY}</Text>}
          {links.map(function (one) { return (<Link href={one.pointer} label={"".concat((0, trail_1.shortPointer)(one.pointer), " (").concat(one.phase, ")")}/>); })}
        </Box>)];
                    }
                    return [4 /*yield*/, $.session.root()];
                case 3:
                    root = _f.sent();
                    path = "".concat(root, "/").concat(artifact.pointer);
                    return [4 /*yield*/, $.fs.read(path).then(function (text) { return ({ text: text }); }, function (error) { return ({ error: error instanceof Error ? error.message : String(error) }); })
                        // Mermaid fences become text art sized to the pane, less the code block's margin.
                    ];
                case 4:
                    read = _f.sent();
                    body = 'text' in read ? (0, exports.clip)((0, mermaid_1.withDiagrams)(read.text, e.props.bodyColumns - 4)) : undefined;
                    open = function (pointer) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, $.state.set(shown, pointer)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, $.ui.open({ id: exports.DOC, title: (0, exports.baseName)(pointer) })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    label = function (one) { return "".concat((0, trail_1.shortPointer)(one.pointer), " (").concat(one.phase, ")"); };
                    return [2 /*return*/, (<Box flexDirection="column">
        {Select === undefined ? (files.map(function (one) { return (<Button key={"file:".concat(one.pointer)} label={label(one)} plain dimColor={one !== artifact} onPress={function () { return open(one.pointer); }}/>); })) : (<Select key="file" label="File" options={files.map(function (one) { return ({ value: one.pointer, label: label(one) }); })} value={artifact.pointer} onSelect={function (value) { return open(value); }}/>)}
        <Box>
          {(0, exports.canApprove)(task, artifact) && (<Button key="approve" label={"Approve ".concat(flow_1.GATED[task.phase])} hotkey="a" variant="primary" onPress={function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var moved;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, $.flow.approve()];
                                            case 1:
                                                moved = _a.sent();
                                                $.ui.toast(moved === null ? 'Nothing to approve.' : "Approved ".concat(task.phase, ". Next: /").concat((0, flow_1.nextAction)(moved).command));
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }}/>)}
          <Button key="revise" label="Revise" hotkey="r" onPress={function () { return __awaiter(void 0, void 0, void 0, function () {
                                var filled, _a, _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _b = (_a = $.prompt).fill;
                                            _c = exports.reviseFill;
                                            return [4 /*yield*/, $.prompt.read()];
                                        case 1: return [4 /*yield*/, _b.apply(_a, [_c.apply(void 0, [(_d.sent()).text, artifact.pointer])])
                                            // No call hands the keys back; Esc does.
                                        ];
                                        case 2:
                                            filled = _d.sent();
                                            // No call hands the keys back; Esc does.
                                            $.ui.toast(filled.isFilled ? 'Finish the sentence in the prompt (Esc returns to it).' : "Type: Revise ".concat(artifact.pointer, ": "));
                                            return [2 /*return*/];
                                    }
                                });
                            }); }}/>
          <Button key="copy" label="Copy path" hotkey="y" onPress={function (press) { return __awaiter(void 0, void 0, void 0, function () {
                                var isCopied;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, $.ui.copy({ text: path, surface: press.surface })];
                                        case 1:
                                            isCopied = (_a.sent()).isCopied;
                                            $.ui.toast(isCopied ? "Copied ".concat(path) : "Could not copy: ".concat(path));
                                            return [2 /*return*/];
                                    }
                                });
                            }); }}/>
          <Button key="close" label="Close" role="dismiss" onPress={function () { return $.ui.close({ id: exports.DOC }); }}/>
        </Box>
        <Text> </Text>
        {body === undefined ? (<Text dimColor>{"Could not read ".concat(artifact.pointer, ": ").concat('error' in read ? read.error : '')}</Text>) : (<Box flexDirection="column">
            <Markdown key="text" text={body.head}/>
            {body.rest > 0 && (<Text dimColor>{"".concat(body.rest, " more characters in ").concat(path)}</Text>)}
          </Box>)}
        {links.length > 0 && <Text> </Text>}
        {links.map(function (one) { return (<Link href={one.pointer} label={label(one)}/>); })}
      </Box>)];
            }
        });
    }); });
};
exports.registerDoc = registerDoc;
