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
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var board_1 = require("../hooks/board");
var flow_1 = require("../hooks/flow");
var trail_1 = require("../hooks/trail");
var fake_1 = require("./fake");
(0, testing_1.test)('infers where a task joins the flow', function () {
    (0, testing_1.expect)((0, flow_1.inferEntry)('#123')).toBe('ticket');
    (0, testing_1.expect)((0, flow_1.inferEntry)('pick up ENG-42 today')).toBe('ticket');
    (0, testing_1.expect)((0, flow_1.inferEntry)('checkout crashes on submit')).toBe('broken');
    (0, testing_1.expect)((0, flow_1.inferEntry)('greenfield billing service')).toBe('foggy');
    (0, testing_1.expect)((0, flow_1.inferEntry)('retry failed checkout payments')).toBe('idea');
});
(0, testing_1.test)('parses --start and refuses an unknown one', function () {
    (0, testing_1.expect)((0, flow_1.parseNew)('--start broken the thing')).toEqual({ text: 'the thing', options: { start: 'broken' } });
    (0, testing_1.expect)((0, flow_1.parseNew)('--start nope x').bad).toBe('--start nope');
    (0, testing_1.expect)((0, flow_1.parseNew)('just words').options.start).toBeUndefined();
});
(0, testing_1.test)('stage skills move the phase, steps only record, others are ignored', function () {
    var task = (0, flow_1.createTask)('Retry checkout', 0);
    (0, testing_1.expect)(task.slug).toBe('retry-checkout');
    (0, testing_1.expect)((0, flow_1.nextAction)(task).command).toBe('grill-with-docs');
    var grilled = (0, flow_1.recordSkill)(task, 'mattpocock-skills:grill-with-docs', 1);
    (0, testing_1.expect)(grilled.phase).toBe('grill-with-docs');
    (0, testing_1.expect)((0, flow_1.nextAction)(grilled).command).toBe('implement');
    var prototyped = (0, flow_1.recordSkill)(grilled, 'prototype', 2);
    (0, testing_1.expect)(prototyped.phase).toBe('grill-with-docs');
    (0, testing_1.expect)(prototyped.history.map(function (step) { return step.skill; })).toEqual(['grill-with-docs', 'prototype']);
    (0, testing_1.expect)((0, flow_1.recordSkill)(prototyped, 'commit', 3)).toBe(prototyped);
});
(0, testing_1.test)('a model-invoked skill is a stage only where the task starts on it', function () {
    var idea = (0, flow_1.createTask)('Retry checkout', 0);
    (0, testing_1.expect)((0, flow_1.recordSkill)(idea, 'diagnosing-bugs', 1).phase).toBe('new');
    var broken = (0, flow_1.createTask)('Checkout crashes', 0);
    (0, testing_1.expect)((0, flow_1.recordSkill)(broken, 'diagnosing-bugs', 1).phase).toBe('diagnosing-bugs');
});
(0, testing_1.test)('paths fold to the repo root and scratch files become artifacts', function () {
    (0, testing_1.expect)((0, flow_1.inside)('/repo', '/repo/src/../.scratch/a/spec.md')).toBe('.scratch/a/spec.md');
    (0, testing_1.expect)((0, flow_1.inside)('/repo', '/repo2/x.ts')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.inside)('/repo', '/repo/../etc/passwd')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.scratchPointer)('.scratch/a/spec.md')).toBe('.scratch/a/spec.md');
    (0, testing_1.expect)((0, flow_1.scratchPointer)('.scratch/a/task.json')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.createdUrl)('gh issue create --title x', 'https://github.com/o/r/issues/12\n')).toBe('https://github.com/o/r/issues/12');
    (0, testing_1.expect)((0, flow_1.createdUrl)('gh issue list', 'https://github.com/o/r/issues/12')).toBeUndefined();
});
(0, testing_1.test)('planning phases hold code edits until allowed', function () {
    var grilled = (0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs', 1);
    (0, testing_1.expect)((0, flow_1.editGate)(grilled, 'src/pay.ts')).toContain('/flow allow');
    (0, testing_1.expect)((0, flow_1.editGate)(grilled, 'docs/adr/0001.md')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.editGate)(grilled, '.scratch/retry-checkout/notes.json')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.editGate)(grilled, undefined)).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.editGate)((0, flow_1.recordSkill)(grilled, 'prototype', 2), 'src/proto.tsx')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.editGate)((0, flow_1.allowPhase)(grilled, 2), 'src/pay.ts')).toBeUndefined();
    (0, testing_1.expect)((0, flow_1.editGate)((0, flow_1.recordSkill)(grilled, 'implement', 2), 'src/pay.ts')).toBeUndefined();
});
(0, testing_1.test)('a gated phase waits for approval once its artifact is recorded, and the rail shows where the task is', function () {
    var specced = (0, flow_1.recordSkill)((0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs', 1), 'to-spec', 2);
    (0, testing_1.expect)((0, flow_1.nextAction)(specced)).toEqual({ command: 'to-spec', why: 'no spec recorded yet: write it, or /flow approve <path or link>' });
    var written = (0, flow_1.recordArtifact)(specced, '.scratch/retry-checkout/spec.md', 3);
    (0, testing_1.expect)((0, flow_1.recordArtifact)(written, '.scratch/retry-checkout/spec.md', 4)).toBe(written);
    (0, testing_1.expect)((0, flow_1.nextAction)(written).why).toBe('read .scratch/retry-checkout/spec.md, then approve the spec');
    (0, testing_1.expect)((0, flow_1.nextAction)((0, flow_1.approvePhase)(written, 4)).command).toBe('to-tickets');
    (0, testing_1.expect)((0, flow_1.approvePhase)((0, flow_1.approvePhase)(written, 4), 5).log.filter(function (one) { return one.kind === 'approve'; })).toHaveLength(1);
    var implementing = (0, flow_1.recordSkill)(written, 'implement', 5);
    (0, testing_1.expect)((0, flow_1.approvePhase)(implementing, 6)).toBe(implementing);
    (0, testing_1.expect)((0, flow_1.rail)(written).map(function (stop) { return "".concat(stop.state, " ").concat(stop.stage); })).toEqual([
        'done grill-with-docs',
        'now to-spec',
        'ahead to-tickets',
        'ahead implement-spec',
        'ahead pr',
        'ahead retro',
    ]);
});
(0, testing_1.test)('checks become before-and-after evidence and the retro gets a timeline', function () {
    (0, testing_1.expect)((0, trail_1.checkOf)('pnpm test --run')).toBe('pnpm test --run');
    (0, testing_1.expect)((0, trail_1.checkOf)('M=/x/flow; cd /tmp && npx tsc -p tsconfig.json && echo OK')).toBe('npx tsc -p tsconfig.json');
    (0, testing_1.expect)((0, trail_1.checkOf)('git checkout test-branch')).toBeUndefined();
    (0, testing_1.expect)((0, trail_1.checkOf)('ls')).toBeUndefined();
    // A PR body in a heredoc or a quote across lines is prose, not a check.
    (0, testing_1.expect)((0, trail_1.checkOf)("gh pr create --title x --body \"$(cat <<'EOF'\n- `claude plugin test plugins/flow`: 15 pass\nEOF\n)\"")).toBeUndefined();
    (0, testing_1.expect)((0, trail_1.checkOf)('git commit -m "fix: retries\n\n- run the tests"')).toBeUndefined();
    (0, testing_1.expect)((0, trail_1.checkOf)('cat <<EOF > run.sh\nnpm test\nEOF\nbash run.sh && pnpm lint')).toBe('pnpm lint');
    var task = (0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0), 'implement', 60000);
    var failed = (0, flow_1.recordEvent)(task, { kind: 'check', detail: 'pnpm test', ok: false }, 120000);
    var passed = (0, flow_1.recordEvent)(failed, { kind: 'check', detail: 'pnpm test', ok: true }, 600000);
    (0, testing_1.expect)((0, trail_1.evidence)(failed)).toEqual(['`pnpm test`: failed at +2m']);
    (0, testing_1.expect)((0, trail_1.evidence)(passed)).toEqual(['`pnpm test`: failed at +2m, then passed at +10m']);
    (0, testing_1.expect)((0, trail_1.timeline)(passed)).toEqual([
        '+1m stage implement',
        '+2m check implement pnpm test failed',
        '+10m check implement pnpm test passed',
    ]);
    (0, testing_1.expect)((0, trail_1.reminder)(passed, 'mattpocock-skills:pr', 'feature')).toContain('then passed at +10m');
    (0, testing_1.expect)((0, trail_1.reminder)(passed, 'retro', 'feature')).toContain('+1m stage implement');
    (0, testing_1.expect)((0, trail_1.reminder)(passed, 'implement', 'main')).toContain('The repo is on main');
    (0, testing_1.expect)((0, trail_1.reminder)(passed, 'implement', 'feature')).not.toContain('The repo is on');
});
(0, testing_1.test)('CI settles from gh pr checks, and an unsettled PR is found again', function () {
    (0, testing_1.expect)((0, trail_1.ciOutcome)('[{"bucket":"pass"},{"bucket":"pending"}]')).toBe('pending');
    (0, testing_1.expect)((0, trail_1.ciOutcome)('[{"bucket":"pass"},{"bucket":"skipping"}]')).toBe('pass');
    (0, testing_1.expect)((0, trail_1.ciOutcome)('[{"bucket":"pass"},{"bucket":"fail"}]')).toBe('fail');
    (0, testing_1.expect)((0, trail_1.ciOutcome)('[]')).toBeUndefined();
    (0, testing_1.expect)((0, trail_1.ciOutcome)('no checks reported')).toBeUndefined();
    var url = 'https://github.com/o/r/pull/7';
    var opened = (0, flow_1.recordArtifact)((0, flow_1.createTask)('Retry checkout', 0), url, 1);
    (0, testing_1.expect)((0, trail_1.unsettledPr)(opened)).toBe(url);
    (0, testing_1.expect)((0, trail_1.unsettledPr)((0, flow_1.recordEvent)(opened, { kind: 'ci', detail: url, ok: true }, 2))).toBeUndefined();
});
(0, testing_1.test)('the version of a board document is read from the tool text', function () {
    var text = [
        '1 document from collection "tasks":',
        '{"id":"shop--x","data":{"title":"a \\"version\\":9 title"},"version":3,"updatedAt":"2026-09-30T13:11:43.458654Z"}',
    ].join('\n');
    (0, testing_1.expect)((0, board_1.boardVersion)(text)).toBe(3);
    (0, testing_1.expect)((0, board_1.boardVersion)('No document "tasks"/"shop--x".')).toBeUndefined();
});
(0, testing_1.test)('the board document carries the rail, gates and next step', function () {
    var _a, _b;
    var specced = (0, flow_1.recordArtifact)((0, flow_1.recordSkill)((0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 0), 'grill-with-docs', 1), 'to-spec', 2), '.scratch/retry-checkout/spec.md', 3);
    var doc = (0, board_1.boardDoc)(specced, 'shop', 9);
    (0, testing_1.expect)(doc.rail.map(function (stop) { var _a; return [stop.stage, stop.state, (_a = stop.gate) !== null && _a !== void 0 ? _a : '-']; })).toEqual([
        ['grill-with-docs', 'done', '-'],
        ['to-spec', 'now', 'waiting'],
        ['to-tickets', 'ahead', 'ahead'],
        ['implement-spec', 'ahead', '-'],
        ['pr', 'ahead', '-'],
        ['retro', 'ahead', '-'],
    ]);
    (0, testing_1.expect)((_a = doc.rail[1]) === null || _a === void 0 ? void 0 : _a.artifacts).toEqual(['.scratch/retry-checkout/spec.md']);
    (0, testing_1.expect)(doc.next.args).toBe('approve');
    (0, testing_1.expect)((_b = (0, board_1.boardDoc)((0, flow_1.approvePhase)(specced, 4), 'shop', 9).rail[1]) === null || _b === void 0 ? void 0 : _b.gate).toBe('approved');
});
(0, testing_1.test)('/flow walks a task from new through a gated spec to done', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var files, opened, path, _a, edit, _b, _c, prompt, _d, _e, _f, _g, _h, _j, closed, _k;
    var _l, _m, _o, _p;
    return __generator(this, function (_q) {
        switch (_q.label) {
            case 0:
                files = (0, fake_1.fakeRepo)(on).files;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 1:
                opened = _q.sent();
                (0, testing_1.expect)(opened.text).toContain('Workflow: Spec: Settle decisions > Write the spec > Split into tickets > Build the tickets > Open the PR > Look back');
                (0, testing_1.expect)(opened.text).toContain('Next: /grill-with-docs Retry failed checkout payments');
                path = '/repo/.scratch/retry-failed-checkout-payments/task.json';
                return [4 /*yield*/, $.skill.prompt({ skill: 'mattpocock-skills:grill-with-docs', text: 'grill' })];
            case 2:
                _q.sent();
                (0, testing_1.expect)(JSON.parse((_l = files.get(path)) !== null && _l !== void 0 ? _l : '{}').phase).toBe('grill-with-docs');
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)(''))];
            case 3:
                _a.apply(void 0, [(_q.sent()).text]).toContain('Next: /to-spec');
                edit = function (file_path) { return $.tool.call({ tool: 'Edit', file_path: file_path, old_string: 'a', new_string: 'b' }); };
                _b = testing_1.expect;
                return [4 /*yield*/, edit('/repo/src/pay.ts')];
            case 4:
                _b.apply(void 0, [(_q.sent()).deny]).toContain('/flow allow');
                (0, testing_1.expect)(JSON.parse((_m = files.get(path)) !== null && _m !== void 0 ? _m : '{}').log.at(-1)).toEqual({ kind: 'held', detail: 'src/pay.ts', phase: 'grill-with-docs', at: 1000 });
                _c = testing_1.expect;
                return [4 /*yield*/, edit('/repo/GLOSSARY.md')];
            case 5:
                _c.apply(void 0, [(_q.sent()).deny]).toBeUndefined();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 6:
                prompt = _q.sent();
                (0, testing_1.expect)(prompt.text).toContain('use "retry-failed-checkout-payments" as the feature slug');
                return [4 /*yield*/, edit('/repo/.scratch/retry-failed-checkout-payments/spec.md')];
            case 7:
                _q.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)(''))];
            case 8:
                _d.apply(void 0, [(_q.sent()).text]).toContain('Next: /flow approve  (read .scratch/retry-failed-checkout-payments/spec.md, then approve the spec)');
                _e = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
            case 9:
                _e.apply(void 0, [(_q.sent()).text]).toBe('Approved to-spec. Next: /to-tickets');
                _f = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
            case 10:
                _f.apply(void 0, [(_q.sent()).text]).toBe('Nothing waits for approval in to-spec.');
                _g = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('allow'))];
            case 11:
                _g.apply(void 0, [(_q.sent()).text]).toBe('Code edits allowed for the rest of to-spec.');
                _h = testing_1.expect;
                return [4 /*yield*/, edit('/repo/src/pay.ts')];
            case 12:
                _h.apply(void 0, [(_q.sent()).deny]).toBeUndefined();
                return [4 /*yield*/, $.tool.call({ tool: 'Bash', command: 'pnpm test' })];
            case 13:
                _q.sent();
                (0, testing_1.expect)(JSON.parse((_o = files.get(path)) !== null && _o !== void 0 ? _o : '{}').log.at(-1)).toMatchObject({ kind: 'check', detail: 'pnpm test', ok: true });
                _j = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('board'))];
            case 14:
                _j.apply(void 0, [(_q.sent()).text]).toBe('to-spec  Retry failed checkout payments  (retry-failed-checkout-payments)');
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('done'))];
            case 15:
                closed = _q.sent();
                (0, testing_1.expect)(closed.text).toBe('Closed: Retry failed checkout payments');
                _k = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)(''))];
            case 16:
                _k.apply(void 0, [(_q.sent()).text]).toContain('No open task');
                (0, testing_1.expect)(JSON.parse((_p = files.get(path)) !== null && _p !== void 0 ? _p : '{}').closedAt).toBe(1000);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('only a person can pass a gate, and only once there is something to read', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var files, queued, _a, path, missing, _b, _c, _d;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                files = (0, fake_1.fakeRepo)(on).files;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new --workflow spec Retry failed checkout payments'))];
            case 1:
                _g.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 2:
                _g.sent();
                return [4 /*yield*/, $.command.run(__assign(__assign({}, (0, fake_1.flow)('approve')), { origin: { kind: 'task-notification' } }))];
            case 3:
                queued = _g.sent();
                (0, testing_1.expect)(queued.text).toBe('/flow approve waits for a person; it was sent from task-notification.');
                // A host's own turn (claude -p, the Agent SDK) is not a person either.
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run(__assign(__assign({}, (0, fake_1.flow)('approve')), { origin: { kind: 'sdk' } }))];
            case 4:
                // A host's own turn (claude -p, the Agent SDK) is not a person either.
                _a.apply(void 0, [(_g.sent()).text]).toContain('waits for a person');
                path = '/repo/.scratch/retry-failed-checkout-payments/task.json';
                (0, testing_1.expect)(JSON.parse((_e = files.get(path)) !== null && _e !== void 0 ? _e : '{}').log.some(function (one) { return one.kind === 'approve'; })).toBe(false);
                missing = 'No spec recorded for to-spec. /flow approve <path or link> names the one you read.';
                _b = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve'))];
            case 5:
                _b.apply(void 0, [(_g.sent()).text]).toBe(missing);
                // A pull request is never the spec.
                _c = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve https://github.com/o/r/pull/3'))];
            case 6:
                // A pull request is never the spec.
                _c.apply(void 0, [(_g.sent()).text]).toBe(missing);
                // Naming what the person read records it, then approves.
                _d = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve .scratch/retry-failed-checkout-payments/spec.md'))];
            case 7:
                // Naming what the person read records it, then approves.
                _d.apply(void 0, [(_g.sent()).text]).toBe('Approved to-spec. Next: /to-tickets');
                (0, testing_1.expect)(JSON.parse((_f = files.get(path)) !== null && _f !== void 0 ? _f : '{}').artifacts.at(-1)).toMatchObject({ phase: 'to-spec', pointer: '.scratch/retry-failed-checkout-payments/spec.md' });
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('auto-advance runs the next stage after approval, unless the context is full', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ran, clock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ran = [];
                on('command.list', function () { return ({
                    value: [{ name: 'mattpocock-skills:to-tickets', description: 'tickets', source: 'plugin' }],
                }); });
                on('command.run', function (_, e) {
                    ran.push(e.command);
                    return { text: '' };
                });
                clock = (0, fake_1.fakeRepo)(on).clock;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 2:
                _a.sent();
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve .scratch/retry-failed-checkout-payments/spec.md'))];
            case 3:
                _a.sent();
                (0, testing_1.expect)(ran).toEqual([]);
                return [4 /*yield*/, clock.advance(0)];
            case 4:
                _a.sent();
                (0, testing_1.expect)(ran).toEqual(['mattpocock-skills:to-tickets']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a full context holds auto-advance at the gate', { options: { autoAdvance: true } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ran, clock, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                ran = [];
                on('command.run', function (_, e) {
                    ran.push(e.command);
                    return { text: '' };
                });
                clock = (0, fake_1.fakeRepo)(on, 80).clock;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 2:
                _b.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('approve .scratch/retry-failed-checkout-payments/spec.md'))];
            case 3:
                _a.apply(void 0, [(_b.sent()).text]).toBe('Approved to-spec. Next: /to-tickets');
                return [4 /*yield*/, clock.advance(0)];
            case 4:
                _b.sent();
                (0, testing_1.expect)(ran).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('/flow share sends every task to the board, and later changes follow', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clock, calls, url, boardWrites, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _a = (0, fake_1.fakeRepo)(on), clock = _a.clock, calls = _a.calls;
                url = 'https://claude.ai/code/artifact/0b1c2d3e-aaaa-bbbb-cccc-123456789abc';
                boardWrites = function () { return calls.filter(function (call) { return call.tool === 'ArtifactData' && call.action === 'batch'; }); };
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('new Retry failed checkout payments'))];
            case 1:
                _e.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('share not-a-link'))];
            case 2:
                _b.apply(void 0, [(_e.sent()).text]).toContain('not a claude.ai artifact link');
                _c = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)("share ".concat(url)))];
            case 3:
                _c.apply(void 0, [(_e.sent()).text]).toBe("Sent 1 task to ".concat(url, ". Each change follows a few seconds later."));
                (0, testing_1.expect)(boardWrites()).toHaveLength(1);
                (0, testing_1.expect)(boardWrites()[0]).toMatchObject({
                    action: 'batch',
                    url: url,
                    writes: [{ op: 'set', collection: 'tasks', doc_id: 'repo--retry-failed-checkout-payments' }],
                });
                return [4 /*yield*/, $.skill.prompt({ skill: 'grill-with-docs', text: 'grill' })];
            case 4:
                _e.sent();
                return [4 /*yield*/, $.skill.prompt({ skill: 'to-spec', text: 'spec' })];
            case 5:
                _e.sent();
                (0, testing_1.expect)(boardWrites()).toHaveLength(1);
                return [4 /*yield*/, clock.advance(3000)];
            case 6:
                _e.sent();
                (0, testing_1.expect)(boardWrites()).toHaveLength(2);
                (0, testing_1.expect)(boardWrites()[1]).toMatchObject({ writes: [{ data: { phase: 'to-spec', next: { command: 'to-spec' } } }] });
                _d = testing_1.expect;
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('share off'))];
            case 7:
                _d.apply(void 0, [(_e.sent()).text]).toContain('Stopped sending');
                return [4 /*yield*/, $.command.run((0, fake_1.flow)('done'))];
            case 8:
                _e.sent();
                return [4 /*yield*/, clock.advance(3000)];
            case 9:
                _e.sent();
                (0, testing_1.expect)(boardWrites()).toHaveLength(2);
                return [2 /*return*/];
        }
    });
}); });
