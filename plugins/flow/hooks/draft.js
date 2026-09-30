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
exports.createFrom = exports.issueOf = exports.githubRef = exports.blocker = exports.preview = exports.flowOfLabel = exports.flowLabels = exports.slugPath = exports.effortOf = exports.guessed = exports.picked = exports.typed = exports.titleOf = exports.blankDraft = void 0;
var flow_1 = require("./flow");
var flows_1 = require("./flows");
var blankDraft = function () { return ({
    text: '',
    title: '',
    flow: 'grill',
    isFlowPicked: false,
    openPr: true,
    worktree: 'never',
    model: '',
    effort: '',
}); };
exports.blankDraft = blankDraft;
/** The name a task gets from its text: the first line, as createTask cuts it. */
var titleOf = function (text) { var _a; return ((_a = text.split('\n')[0]) !== null && _a !== void 0 ? _a : '').trim().slice(0, 72); };
exports.titleOf = titleOf;
/** The draft after the text changed: the name and the guessed flow follow it unless the person set them. */
var typed = function (draft, text) { return (__assign(__assign({}, draft), { text: text, 
    // A name that still equals the old first line was never edited by hand.
    title: draft.title === (0, exports.titleOf)(draft.text) ? (0, exports.titleOf)(text) : draft.title, flow: draft.isFlowPicked ? draft.flow : flows_1.FLOW_OF[(0, flow_1.inferEntry)(text)] })); };
exports.typed = typed;
var picked = function (draft, flow) { return (__assign(__assign({}, draft), { flow: flow, isFlowPicked: true })); };
exports.picked = picked;
/** The draft with a classifier's guess, unless the person picked a flow in the meantime. */
var guessed = function (draft, flow) { return (draft.isFlowPicked ? draft : __assign(__assign({}, draft), { flow: flow })); };
exports.guessed = guessed;
/** The effort a Select value names; anything else keeps the session's. */
var effortOf = function (value) { var _a; return (_a = flows_1.EFFORTS.find(function (one) { return one === value; })) !== null && _a !== void 0 ? _a : ''; };
exports.effortOf = effortOf;
/** The folder the task will live in, from the name it will get. */
var slugPath = function (draft) { return ".scratch/".concat((0, flow_1.slugify)(draft.title.trim() || (0, exports.titleOf)(draft.text)), "/"); };
exports.slugPath = slugPath;
/** The flow a classifier label names; labels read `<flow>: <blurb>`. */
exports.flowLabels = flows_1.FLOW_NAMES.map(function (name) { return "".concat(name, ": ").concat(flows_1.FLOWS[name].blurb); });
var flowOfLabel = function (label) { return flows_1.FLOW_NAMES.find(function (name) { return label === null || label === void 0 ? void 0 : label.startsWith("".concat(name, ":")); }); };
exports.flowOfLabel = flowOfLabel;
/** The phases the flow will run, gated ones marked, and whether the flow is still a guess. */
/** The stages the drafted workflow will run, all ahead, gates marked: what the dialog's strip draws. */
var preview = function (draft) {
    return (0, flow_1.stagesOf)({ flow: draft.flow, entry: (0, flow_1.inferEntry)(draft.text), openPr: draft.openPr }).map(function (stage) { return (__assign({ stage: stage, label: (0, flows_1.stageLabel)(stage), state: 'ahead' }, (stage in flow_1.GATED ? { gate: 'ahead' } : {}))); });
};
exports.preview = preview;
/** Why Create does nothing yet, or undefined when it can go ahead. */
var blocker = function (draft) { return (draft.text.trim() === '' ? 'Describe what to build first.' : undefined); };
exports.blocker = blocker;
var ISSUE_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+\/?$/;
/** What `gh issue view` takes for text that is only a GitHub issue reference, else undefined. */
var githubRef = function (text) {
    var one = text.trim();
    return /^#\d+$/.test(one) ? one.slice(1) : ISSUE_URL.test(one) ? one : undefined;
};
exports.githubRef = githubRef;
/** The issue `gh issue view --json title,body,url` printed, or why it could not be read. */
var issueOf = function (ran) {
    if (ran.exitCode !== 0) {
        return ran.stderr.trim().split('\n')[0] || "gh exited ".concat(ran.exitCode);
    }
    try {
        var _a = JSON.parse(ran.stdout), title = _a.title, url = _a.url, body = _a.body;
        return typeof title === 'string' && typeof url === 'string' ? { title: title, url: url, body: body !== null && body !== void 0 ? body : '' } : 'gh printed no issue';
    }
    catch (_b) {
        return 'gh printed no issue';
    }
};
exports.issueOf = issueOf;
/** What the dialog creates; an issue makes the task start at `ticket` and carry the issue as its ticket. */
var createFrom = function (draft, issue) {
    // A name still equal to the text's first line, or empty, was never edited by hand.
    var isAuto = draft.title.trim() === '' || draft.title === (0, exports.titleOf)(draft.text);
    var title = issue !== undefined && isAuto ? issue.title : draft.title.trim();
    return __assign(__assign(__assign(__assign(__assign({ text: draft.text.trim() }, (title === '' ? {} : { title: title })), (issue === undefined ? {} : { start: 'ticket', ticket: "# ".concat(issue.title, "\n\n").concat(issue.url, "\n\n").concat(issue.body).trim() })), { flow: draft.flow, openPr: draft.openPr, worktree: draft.worktree }), (draft.model === '' ? {} : { model: draft.model })), (draft.effort === '' ? {} : { effort: draft.effort }));
};
exports.createFrom = createFrom;
