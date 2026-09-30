"use strict";
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
exports.fakeRepo = exports.flow = void 0;
var testing_1 = require("claude-code/testing");
/** `/flow <args>` as the person types it. */
var flow = function (args) {
    return ({ command: 'flow', args: args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } });
};
exports.flow = flow;
/**
 * A repo at /repo whose files live in a map, with the engine calls the mod makes answered.
 * `worktree` starts the session inside a linked worktree; an EnterWorktree call moves it into one, as the tool does.
 */
var fakeRepo = function (on, percent, worktree) {
    if (percent === void 0) { percent = 10; }
    testing_1.mock.store(on);
    var clock = testing_1.mock.clock(on, { now: 1000 });
    var files = new Map();
    // ponytail: one mutable root, the session's cwd as EnterWorktree moves it.
    var root = worktree !== null && worktree !== void 0 ? worktree : '/repo';
    on('session.root', function () { return ({ value: root }); });
    on('session.repo', function () { return ({ value: { root: '/repo', remote: null, internal: false, name: null } }); });
    on('skill.prompt', function (_, e) { return ({ text: e.text }); });
    on('fs.list', function (_, e) {
        var names = __spreadArray([], files.keys(), true).filter(function (key) { return key.startsWith("".concat(e.path, "/")); }).map(function (key) { var _a; return (_a = key.slice(e.path.length + 1).split('/')[0]) !== null && _a !== void 0 ? _a : ''; });
        return { value: __spreadArray([], new Set(names), true).map(function (name) { return ({ name: name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false }); }) };
    });
    on('ui.open', function () { return ({ value: { isPlaced: true } }); });
    var calls = [];
    on('tool.call', function (_, e) {
        calls.push(e);
        if (e.tool === 'EnterWorktree') {
            root = typeof e.path === 'string' ? e.path : "/repo/.claude/worktrees/".concat(String(e.name));
        }
        return { result: 'ok', text: 'ok' };
    });
    on('session.usage', function () { return ({ value: { startedAt: 0, context: { window: 200000, percent: percent }, rateLimits: [] } }); });
    var runs = [];
    on('process.run', function (_, e) {
        runs.push(e.argv);
        return { value: { exitCode: 0, stdout: 'feature\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } };
    });
    on('fs.exists', function (_, e) { return ({ value: __spreadArray([], files.keys(), true).some(function (key) { return key === e.path || key.startsWith("".concat(e.path, "/")); }) }); });
    on('fs.write', function (_, e) {
        files.set(e.path, e.text);
        return { value: undefined };
    });
    var toasts = [];
    on('ui.toast', function (_, e) {
        toasts.push(e.text);
        return { value: undefined };
    });
    on('fs.read', function (_, e) {
        var text = files.get(e.path);
        if (text === undefined) {
            throw new Error("ENOENT ".concat(e.path));
        }
        return { value: text };
    });
    return { files: files, clock: clock, calls: calls, toasts: toasts, runs: runs };
};
exports.fakeRepo = fakeRepo;
