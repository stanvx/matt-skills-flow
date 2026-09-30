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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.registerNoun = void 0;
var flow_1 = require("./flow");
var board_1 = require("./board");
var trail_1 = require("./trail");
var current = { plugin: 'flow', key: 'task' };
var taskPath = function (root, slug) { return "".concat(root, "/.scratch/").concat(slug, "/task.json"); };
var pointerKey = function (root) { return "current:".concat(root); };
var openOnly = function (task) { return ((task === null || task === void 0 ? void 0 : task.closedAt) === undefined ? task : null); };
var BOARD_KEY = 'board';
// Changes within this window reach the board as one write.
var BOARD_SYNC_MS = 3000;
var CI_POLL_MS = 60000;
// Right after `gh pr create` a PR has no checks yet: wait this many polls for some.
var CI_EMPTY_POLLS = 5;
var registerNoun = function (on) {
    // Changes run one at a time: two hooks at once (a tool the model runs in parallel with another)
    // would each read the same task, and the later save would drop the earlier change. It lives
    // here, not in engine.create, which builds a fresh $ for each dispatch.
    // ponytail: one queue per plugin load, in this process; a lock file if two processes ever share a task.
    var queue = Promise.resolve();
    on('engine.create', function (_, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var built, watching, unsent, sending, home, task, load, save, board, sync, change, enterWorktree, note, create;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)
                    // ponytail: one CI watch at a time, the latest PR; a map by URL if tasks ever run PRs side by side.
                ];
                case 1:
                    built = _a.sent();
                    unsent = {};
                    home = function () { return __awaiter(void 0, void 0, void 0, function () { var _a; var _b, _c; return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, built.session.repo().catch(function () { return null; })];
                            case 1:
                                if (!((_c = (_b = (_d.sent())) === null || _b === void 0 ? void 0 : _b.root) !== null && _c !== void 0)) return [3 /*break*/, 2];
                                _a = _c;
                                return [3 /*break*/, 4];
                            case 2: return [4 /*yield*/, built.session.root()];
                            case 3:
                                _a = (_d.sent());
                                _d.label = 4;
                            case 4: return [2 /*return*/, _a];
                        }
                    }); }); };
                    task = function () { return __awaiter(void 0, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, built.state.get(current)];
                            case 1: return [2 /*return*/, (_a = (_b.sent()).value) !== null && _a !== void 0 ? _a : null];
                        }
                    }); }); };
                    load = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var root, text;
                        var slug = _b.slug;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, home()];
                                case 1:
                                    root = _c.sent();
                                    return [4 /*yield*/, built.fs.read(taskPath(root, slug)).catch(function () { return undefined; })];
                                case 2:
                                    text = _c.sent();
                                    return [2 /*return*/, typeof text === 'string' ? (0, flow_1.withDefaults)(JSON.parse(text)) : null];
                            }
                        });
                    }); };
                    save = function (saved) { return __awaiter(void 0, void 0, void 0, function () {
                        var root;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, home()];
                                case 1:
                                    root = _b.sent();
                                    return [4 /*yield*/, built.fs.write(taskPath(root, saved.slug), "".concat(JSON.stringify(saved, null, 2), "\n"))];
                                case 2:
                                    _b.sent();
                                    if (!(saved.closedAt === undefined)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, built.store.set(pointerKey(root), saved.slug)];
                                case 3:
                                    _b.sent();
                                    return [3 /*break*/, 6];
                                case 4: return [4 /*yield*/, built.store.delete(pointerKey(root))];
                                case 5:
                                    _b.sent();
                                    _b.label = 6;
                                case 6: return [4 /*yield*/, built.state.set(current, openOnly(saved))];
                                case 7:
                                    _b.sent();
                                    return [4 /*yield*/, board()];
                                case 8:
                                    if ((_b.sent()) !== null) {
                                        unsent = __assign(__assign({}, unsent), (_a = {}, _a[saved.slug] = saved, _a));
                                        sending === null || sending === void 0 ? void 0 : sending.cancel();
                                        sending = built.clock.after(BOARD_SYNC_MS, function () {
                                            var tasks = Object.values(unsent);
                                            unsent = {};
                                            void sync({ tasks: tasks });
                                        });
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    board = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var url;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, built.store.get(BOARD_KEY)];
                                case 1:
                                    url = _a.sent();
                                    return [2 /*return*/, typeof url === 'string' ? url : null];
                            }
                        });
                    }); };
                    sync = function () {
                        var args_1 = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args_1[_i] = arguments[_i];
                        }
                        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (_a) {
                            var url, open, sent, repo, _b, at, versionOf, writes, ran;
                            var _c, _d;
                            var _e = _a === void 0 ? {} : _a, tasks = _e.tasks;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0: return [4 /*yield*/, board()];
                                    case 1:
                                        url = _f.sent();
                                        return [4 /*yield*/, task()];
                                    case 2:
                                        open = _f.sent();
                                        sent = tasks !== null && tasks !== void 0 ? tasks : (open === null ? [] : [open]);
                                        if (url === null || sent.length === 0) {
                                            return [2 /*return*/, 0];
                                        }
                                        _b = board_1.repoName;
                                        return [4 /*yield*/, home()];
                                    case 3:
                                        repo = _b.apply(void 0, [_f.sent()]);
                                        return [4 /*yield*/, built.clock.now()
                                            // A write over an existing document must name the version it replaces.
                                        ];
                                    case 4:
                                        at = _f.sent();
                                        versionOf = function (doc_id) { return __awaiter(void 0, void 0, void 0, function () {
                                            var got;
                                            var _a;
                                            return __generator(this, function (_b) {
                                                switch (_b.label) {
                                                    case 0: return [4 /*yield*/, built.tool.call({ tool: 'ArtifactData', action: 'get', url: url, collection: 'tasks', doc_id: doc_id })];
                                                    case 1:
                                                        got = _b.sent();
                                                        return [2 /*return*/, got.deny === undefined ? (0, board_1.boardVersion)((_a = got.text) !== null && _a !== void 0 ? _a : '') : undefined];
                                                }
                                            });
                                        }); };
                                        return [4 /*yield*/, Promise.all(sent.slice(0, 50).map(function (one) { return __awaiter(void 0, void 0, void 0, function () {
                                                var doc_id, version;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            doc_id = (0, board_1.boardId)(repo, one.slug);
                                                            return [4 /*yield*/, versionOf(doc_id)];
                                                        case 1:
                                                            version = _a.sent();
                                                            return [2 /*return*/, __assign({ op: 'set', collection: 'tasks', doc_id: doc_id, data: (0, board_1.boardDoc)(one, repo, at) }, (version === undefined ? {} : { if_version: version }))];
                                                    }
                                                });
                                            }); }))];
                                    case 5:
                                        writes = _f.sent();
                                        return [4 /*yield*/, built.tool.call({ tool: 'ArtifactData', action: 'batch', url: url, writes: writes })];
                                    case 6:
                                        ran = _f.sent();
                                        if (ran.deny !== undefined || ran.isError === true) {
                                            built.ui.toast("flow could not update the board: ".concat((_d = (_c = ran.deny) !== null && _c !== void 0 ? _c : ran.text) !== null && _d !== void 0 ? _d : 'no reason given'));
                                            return [2 /*return*/, 0];
                                        }
                                        return [2 /*return*/, writes.length];
                                }
                            });
                        });
                    };
                    change = function (move) {
                        var run = queue.then(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var cached, open, _a, moved, _b, _c;
                            var _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, task()];
                                    case 1:
                                        cached = _e.sent();
                                        if (!(cached === null)) return [3 /*break*/, 2];
                                        _a = null;
                                        return [3 /*break*/, 4];
                                    case 2: return [4 /*yield*/, load({ slug: cached.slug })];
                                    case 3:
                                        _a = ((_d = (_e.sent())) !== null && _d !== void 0 ? _d : cached);
                                        _e.label = 4;
                                    case 4:
                                        open = _a;
                                        if (open === null) {
                                            return [2 /*return*/, null];
                                        }
                                        _b = move;
                                        _c = [open];
                                        return [4 /*yield*/, built.clock.now()];
                                    case 5:
                                        moved = _b.apply(void 0, _c.concat([_e.sent()]));
                                        if (!(moved !== open)) return [3 /*break*/, 7];
                                        return [4 /*yield*/, save(moved)];
                                    case 6:
                                        _e.sent();
                                        _e.label = 7;
                                    case 7: return [2 /*return*/, moved];
                                }
                            });
                        }); });
                        queue = run.catch(function () { return undefined; });
                        return run;
                    };
                    enterWorktree = function (open) { return __awaiter(void 0, void 0, void 0, function () {
                        var main, listed, path, entered, root, _a;
                        var _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, home()];
                                case 1:
                                    main = _e.sent();
                                    return [4 /*yield*/, built.session.root()];
                                case 2:
                                    if ((_e.sent()) !== main) {
                                        return [2 /*return*/, true];
                                    }
                                    return [4 /*yield*/, built.process.run(['git', 'worktree', 'list', '--porcelain'], { cwd: main }).catch(function () { return undefined; })];
                                case 3:
                                    listed = _e.sent();
                                    path = ((_b = listed === null || listed === void 0 ? void 0 : listed.stdout) !== null && _b !== void 0 ? _b : '')
                                        .split('\n')
                                        .map(function (line) { return (line.startsWith('worktree ') ? line.slice('worktree '.length) : ''); })
                                        .find(function (one) { return one !== main && one.split('/').at(-1) === open.slug; });
                                    return [4 /*yield*/, built.tool.call(path === undefined ? { tool: 'EnterWorktree', name: open.slug } : { tool: 'EnterWorktree', path: path })];
                                case 4:
                                    entered = _e.sent();
                                    if (entered.deny !== undefined || entered.isError === true) {
                                        built.ui.toast("flow could not enter the task's worktree: ".concat((_d = (_c = entered.deny) !== null && _c !== void 0 ? _c : entered.text) !== null && _d !== void 0 ? _d : 'no reason given'));
                                        return [2 /*return*/, false];
                                    }
                                    return [4 /*yield*/, built.session.root()];
                                case 5:
                                    root = _e.sent();
                                    _a = root !== main;
                                    if (!_a) return [3 /*break*/, 7];
                                    return [4 /*yield*/, built.fs.exists("".concat(root, "/.scratch"))];
                                case 6:
                                    _a = !(_e.sent());
                                    _e.label = 7;
                                case 7:
                                    if (!_a) return [3 /*break*/, 9];
                                    return [4 /*yield*/, built.process.run(['ln', '-s', "".concat(main, "/.scratch"), "".concat(root, "/.scratch")])];
                                case 8:
                                    _e.sent();
                                    _e.label = 9;
                                case 9: return [2 /*return*/, true];
                            }
                        });
                    }); };
                    note = function (event) { return change(function (open, at) { return (0, flow_1.recordEvent)(open, event, at); }); };
                    create = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
                        var at, fresh, existing, _b, _closedAt, resumed, body, pointer, _c, _d, _e, opened;
                        var text = _a.text, ticket = _a.ticket, options = __rest(_a, ["text", "ticket"]);
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0: return [4 /*yield*/, built.clock.now()];
                                case 1:
                                    at = _f.sent();
                                    fresh = (0, flow_1.createTask)(text, at, options);
                                    return [4 /*yield*/, load({ slug: fresh.slug })];
                                case 2:
                                    existing = _f.sent();
                                    _b = existing !== null && existing !== void 0 ? existing : fresh, _closedAt = _b.closedAt, resumed = __rest(_b, ["closedAt"]);
                                    body = (ticket !== null && ticket !== void 0 ? ticket : (text.includes('\n') ? text : '')).trim();
                                    pointer = ".scratch/".concat(fresh.slug, "/ticket.md");
                                    if (!(existing === null && body !== '')) return [3 /*break*/, 5];
                                    _d = (_c = built.fs).write;
                                    _e = "".concat;
                                    return [4 /*yield*/, home()];
                                case 3: return [4 /*yield*/, _d.apply(_c, [_e.apply("", [_f.sent(), "/"]).concat(pointer), "".concat(body, "\n")])];
                                case 4:
                                    _f.sent();
                                    _f.label = 5;
                                case 5:
                                    opened = existing === null && body !== '' ? (0, flow_1.recordArtifact)(resumed, pointer, at) : resumed;
                                    return [4 /*yield*/, save(opened)];
                                case 6:
                                    _f.sent();
                                    return [2 /*return*/, { task: opened, isNew: existing === null }];
                            }
                        });
                    }); };
                    return [2 /*return*/, __assign(__assign({}, built), { flow: {
                                task: task,
                                create: create,
                                load: load,
                                save: save,
                                note: note,
                                board: board,
                                sync: sync,
                                share: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var url = _b.url;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0:
                                                if (!(url === null)) return [3 /*break*/, 2];
                                                return [4 /*yield*/, built.store.delete(BOARD_KEY)];
                                            case 1:
                                                _c.sent();
                                                return [3 /*break*/, 4];
                                            case 2: return [4 /*yield*/, built.store.set(BOARD_KEY, url)];
                                            case 3:
                                                _c.sent();
                                                _c.label = 4;
                                            case 4: return [2 /*return*/];
                                        }
                                    });
                                }); },
                                all: function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var root, dirs, tasks;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, home()];
                                            case 1:
                                                root = _a.sent();
                                                return [4 /*yield*/, built.fs.list("".concat(root, "/.scratch")).catch(function () { return []; })];
                                            case 2:
                                                dirs = _a.sent();
                                                return [4 /*yield*/, Promise.all(dirs.filter(function (one) { return one.kind === 'dir'; }).map(function (one) { return load({ slug: one.name }); }))];
                                            case 3:
                                                tasks = _a.sent();
                                                return [2 /*return*/, tasks.filter(function (one) { return one !== null; }).sort(function (a, b) { return b.createdAt - a.createdAt; })];
                                        }
                                    });
                                }); },
                                next: function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var open;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, task()];
                                            case 1:
                                                open = _a.sent();
                                                return [2 /*return*/, open === null ? null : (0, flow_1.nextAction)(open)];
                                        }
                                    });
                                }); },
                                run: function (input) { return __awaiter(void 0, void 0, void 0, function () {
                                    var open, isMoved, _a, _b, recommended, step, found;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0: return [4 /*yield*/, task()];
                                            case 1:
                                                open = _c.sent();
                                                isMoved = (input === null || input === void 0 ? void 0 : input.expect) !== undefined && ((open === null || open === void 0 ? void 0 : open.slug) !== input.expect.slug || open.phase !== input.expect.phase);
                                                _a = open === null || isMoved;
                                                if (_a) return [3 /*break*/, 4];
                                                _b = open.worktree === 'now';
                                                if (!_b) return [3 /*break*/, 3];
                                                return [4 /*yield*/, enterWorktree(open)];
                                            case 2:
                                                _b = !(_c.sent());
                                                _c.label = 3;
                                            case 3:
                                                _a = (_b);
                                                _c.label = 4;
                                            case 4:
                                                if (_a) {
                                                    return [2 /*return*/];
                                                }
                                                recommended = (0, flow_1.nextAction)(open);
                                                step = (input === null || input === void 0 ? void 0 : input.alt) === true && recommended.alt !== undefined ? recommended.alt : recommended;
                                                return [4 /*yield*/, built.command.list()];
                                            case 5:
                                                found = (_c.sent()).find(function (one) { return (0, flow_1.skillName)(one.name) === step.command; });
                                                if (found === undefined) {
                                                    built.ui.toast("/".concat(step.command, " is not installed"));
                                                    return [2 /*return*/];
                                                }
                                                return [4 /*yield*/, built.command.run({ command: found.name, args: step.args })];
                                            case 6:
                                                _c.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                                enter: function (_a) {
                                    var skill = _a.skill;
                                    return change(function (open, at) { return (0, flow_1.recordSkill)(open, skill, at); });
                                },
                                produce: function (_a) {
                                    var pointer = _a.pointer;
                                    return change(function (open, at) { return (0, flow_1.recordArtifact)(open, pointer, at); });
                                },
                                approve: function () { return change(flow_1.approvePhase); },
                                allow: function () { return change(flow_1.allowPhase); },
                                watch: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                    var polls, poll;
                                    var url = _b.url;
                                    return __generator(this, function (_c) {
                                        watching === null || watching === void 0 ? void 0 : watching.cancel();
                                        polls = 0;
                                        poll = function () { return __awaiter(void 0, void 0, void 0, function () {
                                            var ran, outcome;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        polls += 1;
                                                        return [4 /*yield*/, built.process.run(['gh', 'pr', 'checks', url, '--json', 'bucket']).catch(function () { return undefined; })];
                                                    case 1:
                                                        ran = _a.sent();
                                                        outcome = ran === undefined ? undefined : (0, trail_1.ciOutcome)(ran.stdout);
                                                        if (outcome === 'pending' || (outcome === undefined && polls < CI_EMPTY_POLLS)) {
                                                            return [2 /*return*/];
                                                        }
                                                        watching === null || watching === void 0 ? void 0 : watching.cancel();
                                                        watching = undefined;
                                                        if (!(outcome !== undefined)) return [3 /*break*/, 3];
                                                        return [4 /*yield*/, note({ kind: 'ci', detail: url, ok: outcome === 'pass' })];
                                                    case 2:
                                                        _a.sent();
                                                        built.ui.toast("CI ".concat(outcome === 'pass' ? 'passed' : 'failed', ": ").concat(url));
                                                        _a.label = 3;
                                                    case 3: return [2 /*return*/];
                                                }
                                            });
                                        }); };
                                        watching = built.clock.every(CI_POLL_MS, function () { return void poll(); });
                                        return [2 /*return*/];
                                    });
                                }); },
                                resume: function () { return __awaiter(void 0, void 0, void 0, function () {
                                    var slug, _a, _b, _c, open, _d, _e;
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0:
                                                _b = (_a = built.store).get;
                                                _c = pointerKey;
                                                return [4 /*yield*/, home()];
                                            case 1: return [4 /*yield*/, _b.apply(_a, [_c.apply(void 0, [_f.sent()])])];
                                            case 2:
                                                slug = _f.sent();
                                                _d = openOnly;
                                                if (!(typeof slug === 'string')) return [3 /*break*/, 4];
                                                return [4 /*yield*/, load({ slug: slug })];
                                            case 3:
                                                _e = _f.sent();
                                                return [3 /*break*/, 5];
                                            case 4:
                                                _e = null;
                                                _f.label = 5;
                                            case 5:
                                                open = _d.apply(void 0, [_e]);
                                                return [4 /*yield*/, built.state.set(current, open)];
                                            case 6:
                                                _f.sent();
                                                return [2 /*return*/, open];
                                        }
                                    });
                                }); },
                            } })];
            }
        });
    }); });
};
exports.registerNoun = registerNoun;
