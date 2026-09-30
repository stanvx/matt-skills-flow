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
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardDoc = exports.railView = exports.boardVersion = exports.repoName = exports.boardId = void 0;
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var trail_1 = require("./trail");
/** The board document's id: the repo and the slug, so repos share one board. */
var boardId = function (repo, slug) { return "".concat((0, flow_1.slugify)(repo), "--").concat(slug).slice(0, 120); };
exports.boardId = boardId;
/** The repo's folder name, as the board labels it. */
var repoName = function (root) { var _a; return (_a = root.split('/').filter(Boolean).at(-1)) !== null && _a !== void 0 ? _a : 'repo'; };
exports.repoName = repoName;
/** The version an ArtifactData read names for its document, or undefined when there is none. */
// ponytail: read from the tool's text, where each document ends `"version":N,"updatedAt":"..."}`;
// the typed result once the tool declares one.
var boardVersion = function (text) {
    var found = /"version":(\d+),"updatedAt":"[\dT:.Z-]+"\}\s*$/m.exec(text);
    return found === null ? undefined : Number(found[1]);
};
exports.boardVersion = boardVersion;
/** The rail with each gate's state and each stage's artifacts: what the pane and the board both draw. */
var railView = function (task) {
    var approvedPhases = task.log.filter(function (one) { return one.kind === 'approve'; }).map(function (one) { return one.phase; });
    return (0, flow_1.rail)(task).map(function (stop) { return (__assign(__assign(__assign(__assign({}, stop), { label: (0, flows_1.stageLabel)(stop.stage), command: (0, flows_1.commandOf)(stop.stage) }), (stop.stage in flow_1.GATED
        ? { gate: approvedPhases.includes(stop.stage) ? 'approved' : stop.state === 'now' && (0, flow_1.isWaiting)(task) ? 'waiting' : 'ahead' }
        : {})), { artifacts: task.artifacts.filter(function (one) { return one.phase === stop.stage; }).map(function (one) { return one.pointer; }) })); });
};
exports.railView = railView;
var boardDoc = function (task, repo, at) {
    var _a;
    var ci = task.log.filter(function (one) { return one.kind === 'ci'; }).at(-1);
    return __assign(__assign(__assign(__assign(__assign(__assign({ repo: repo, slug: task.slug, title: task.title, entry: task.entry, flow: task.flow, 
        // The board never knows whether a turn runs, so a task is never `working` there.
        status: (0, flow_1.statusOf)(task, false), openPr: task.openPr }, (task.model === undefined ? {} : { model: task.model })), (task.effort === undefined ? {} : { effort: task.effort })), { phase: task.phase, isOpen: task.closedAt === undefined, next: (0, flow_1.nextAction)(task), rail: (0, exports.railView)(task), evidence: (0, trail_1.evidence)(task) }), (ci === undefined ? {} : { ci: { ok: ci.ok === true, url: (_a = ci.detail) !== null && _a !== void 0 ? _a : '' } })), { journey: (0, trail_1.journey)(task), createdAt: task.createdAt, updatedAt: at }), (task.closedAt === undefined ? {} : { closedAt: task.closedAt }));
};
exports.boardDoc = boardDoc;
