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
exports.reminder = exports.unsettledPr = exports.ciOutcome = exports.shortPointer = exports.timeline = exports.journey = exports.evidence = exports.checkOf = void 0;
var flow_1 = require("./flow");
var flows_1 = require("./flows");
/** The command without heredoc bodies or quoted text that spans lines: a PR body is prose, not a check. */
// ponytail: patterns, not a shell parser; a tokenizer if an escaped quote ever splits one.
var withoutBodies = function (command) {
    return command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2(?=\s|$)/g, '').replace(/"[^"]*\n[^"]*"|'[^']*\n[^']*'/g, '""');
};
/** The part of a Bash command that runs a check worth keeping as evidence, or undefined. */
// ponytail: word match per segment; a project list in userConfig if it misses.
var checkOf = function (command) {
    var _a;
    return (_a = withoutBodies(command)
        .split(/&&|\|\||;|\n|\|/)
        .map(function (part) { return part.trim(); })
        .find(function (part) { return /\b(test|tests|vitest|jest|pytest|typecheck|tsc|lint)\b/.test(part) && !/^(gh|git)\s/.test(part); })) === null || _a === void 0 ? void 0 : _a.slice(0, 80);
};
exports.checkOf = checkOf;
var since = function (task, at) { return "+".concat(Math.max(0, Math.round((at - task.createdAt) / 60000)), "m"); };
/** Each check's first failure and latest run, for the PR's before and after. */
var evidence = function (task) {
    var checks = task.log.filter(function (one) { return one.kind === 'check'; });
    return __spreadArray([], new Set(checks.map(function (one) { var _a; return (_a = one.detail) !== null && _a !== void 0 ? _a : ''; })), true).map(function (command) {
        var runs = checks.filter(function (one) { return one.detail === command; });
        var failed = runs.find(function (one) { return one.ok === false; });
        var last = runs.at(-1);
        var latest = last === undefined ? '' : "".concat(last.ok ? 'passed' : 'failed', " at ").concat(since(task, last.at));
        return failed === undefined || failed === last
            ? "`".concat(command, "`: ").concat(latest)
            : "`".concat(command, "`: failed at ").concat(since(task, failed.at), ", then ").concat(latest);
    });
};
exports.evidence = evidence;
/** Everything that happened to the task in order, the latest 80. */
var journey = function (task) {
    return __spreadArray(__spreadArray(__spreadArray([], task.history.map(function (step) { return ({ at: step.at, kind: (0, flow_1.isStage)(step.skill, task) ? 'stage' : 'step', what: step.skill }); }), true), task.artifacts.map(function (one) { return ({ at: one.at, kind: 'artifact', what: one.pointer }); }), true), task.log.map(function (one) { return (__assign({ at: one.at, kind: one.kind, what: [one.phase, one.detail].filter(Boolean).join(' ') }, (one.ok === undefined ? {} : { ok: one.ok }))); }), true).sort(function (a, b) { return a.at - b.at; })
        .slice(-80);
};
exports.journey = journey;
/** The journey as lines, minutes from the task's start. */
var timeline = function (task) {
    return (0, exports.journey)(task).map(function (one) {
        return "".concat(since(task, one.at), " ").concat([one.kind, one.what, 'ok' in one ? (one.ok ? 'passed' : 'failed') : undefined]
            .filter(Boolean)
            .join(' '));
    });
};
exports.timeline = timeline;
/** A pointer as a person reads it: `PR #7`, `issue #12`, or the last two path segments. */
var shortPointer = function (pointer) {
    var numbered = /\/(pull|issues)\/(\d+)$/.exec(pointer);
    if (numbered !== null) {
        return "".concat(numbered[1] === 'pull' ? 'PR' : 'issue', " #").concat(numbered[2]);
    }
    return pointer.split('/').slice(-2).join('/');
};
exports.shortPointer = shortPointer;
/** `pass`, `fail` or `pending` from `gh pr checks --json bucket`; undefined when there is nothing to read. */
var ciOutcome = function (stdout) {
    var buckets = (function () {
        try {
            var parsed = JSON.parse(stdout);
            return Array.isArray(parsed) ? parsed.map(function (one) { return one.bucket; }) : [];
        }
        catch (_a) {
            return [];
        }
    })();
    if (buckets.length === 0) {
        return undefined;
    }
    if (buckets.includes('pending')) {
        return 'pending';
    }
    return buckets.some(function (bucket) { return bucket === 'fail' || bucket === 'cancel'; }) ? 'fail' : 'pass';
};
exports.ciOutcome = ciOutcome;
/** The latest PR the task opened whose CI has not settled yet. */
var unsettledPr = function (task) {
    var _a;
    var pr = (_a = task === null || task === void 0 ? void 0 : task.artifacts.filter(function (one) { return /\/pull\/\d+$/.test(one.pointer); }).at(-1)) === null || _a === void 0 ? void 0 : _a.pointer;
    return pr !== undefined && !(task === null || task === void 0 ? void 0 : task.log.some(function (one) { return one.kind === 'ci' && one.detail === pr; })) ? pr : undefined;
};
exports.unsettledPr = unsettledPr;
/** What the model reads after a tracked skill's prompt; `branch` is the repo's current one. */
var reminder = function (task, skill, branch) {
    var _a;
    var name = (0, flow_1.skillName)(skill);
    var proof = (0, exports.evidence)(task);
    return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "flow: this runs inside the task \"".concat(task.title, "\" (.scratch/").concat(task.slug, "/task.json), phase ").concat(task.phase, "."),
        task.flow === 'freeform'
            ? 'Workflow Freeform: no fixed phases.'
            : "Workflow ".concat(flows_1.FLOWS[task.flow].label, ": ").concat((0, flow_1.stagesOf)(task)
                .map(function (stage) { return "".concat((0, flows_1.stageLabel)(stage), " (/").concat((0, flows_1.commandOf)(stage), ")"); })
                .join(' -> '), "."),
        "If the issue tracker is local markdown, use \"".concat(task.slug, "\" as the feature slug.")
    ], (task.artifacts.length === 0
        ? []
        : [
            "Artifacts so far, oldest first: ".concat(task.artifacts.map(function (one) { return "".concat(one.pointer, " (").concat(one.phase, ")"); }).join(', '), "."),
            'A later artifact wins over an earlier one, and live code beats any document.',
        ]), true), (flow_1.PLANNING.includes(task.phase) && !(0, flow_1.isAllowed)(task)
        ? ['Planning phase: code edits wait for /implement; markdown, .scratch/ and prototypes are fine.']
        : []), true), ((name === 'implement' || name === 'implement-spec') && ['main', 'master'].includes(branch)
        ? ["The repo is on ".concat(branch, ": make a branch or a worktree (EnterWorktree) before the first edit.")]
        : []), true), (name === 'pr' && proof.length > 0
        ? __spreadArray(['Checks this task ran, for the Evidence section (minutes from the task start):'], proof, true) : []), true), (name === 'wayfinder' && task.phase === 'wayfinder'
        ? [
            "Charting the map: label it wayfinder:map (on a local tracker, write it to .scratch/".concat(task.slug, "/map.md); the flow mod keeps it as this task's map."),
        ]
        : []), true), (name === 'wayfinder' && task.phase === 'wayfinder-clear'
        ? [
            "Clearing the map ".concat((_a = (0, flow_1.mapOf)(task)) !== null && _a !== void 0 ? _a : "(ask the user for the map's link)", ": resolve one frontier ticket this session. When no ticket is left, tell the user the map is clear so they can move on to /to-spec."),
        ]
        : []), true), (name === 'to-spec'
        ? ['Include one mermaid diagram of the key flow in the spec (a flowchart LR or a sequenceDiagram): the flow mod draws it in the artifact tab.']
        : []), true), (name === 'to-tickets'
        ? [
            "Include a mermaid flowchart LR of the tickets and their blocking edges where the tickets are published (the first ticket, or an overview under .scratch/".concat(task.slug, "/): the flow mod draws it."),
        ]
        : []), true), ((0, flow_1.isStage)(name, task)
        ? ["When this stage's work is finished (not after each question), call mcp__flow__stage_done with a one-line summary."]
        : []), true), (name === 'retro' ? __spreadArray(['Timeline of this task, minutes from its start:'], (0, exports.timeline)(task), true) : []), true).join('\n');
};
exports.reminder = reminder;
