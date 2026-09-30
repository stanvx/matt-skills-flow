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
var testing_1 = require("claude-code/testing");
var draft_1 = require("../hooks/draft");
var strip_1 = require("../hooks/strip");
(0, testing_1.test)('typing follows the name and the guessed flow until they are set by hand', function () {
    var start = (0, draft_1.blankDraft)();
    (0, testing_1.expect)(start).toEqual({
        text: '',
        title: '',
        flow: 'grill',
        isFlowPicked: false,
        openPr: true,
        worktree: 'never',
        model: '',
        effort: '',
    });
    var typedIdea = (0, draft_1.typed)(start, 'checkout crashes on submit\nsecond line');
    (0, testing_1.expect)(typedIdea).toMatchObject({ title: 'checkout crashes on submit', flow: 'oneshot' });
    (0, testing_1.expect)((0, draft_1.typed)(typedIdea, '#12').flow).toBe('oneshot');
    (0, testing_1.expect)((0, draft_1.typed)(typedIdea, 'greenfield billing').flow).toBe('wayfind');
    var named = (0, draft_1.typed)(__assign(__assign({}, typedIdea), { title: 'My name' }), 'something else');
    (0, testing_1.expect)(named.title).toBe('My name');
    var chosen = (0, draft_1.picked)(typedIdea, 'spec');
    (0, testing_1.expect)((0, draft_1.typed)(chosen, 'retry checkout')).toMatchObject({ flow: 'spec', isFlowPicked: true });
    (0, testing_1.expect)((0, draft_1.guessed)(chosen, 'oneshot').flow).toBe('spec');
    (0, testing_1.expect)((0, draft_1.guessed)(typedIdea, 'freeform').flow).toBe('freeform');
    (0, testing_1.expect)((0, draft_1.typed)(start, 'x'.repeat(100)).title).toHaveLength(72);
});
(0, testing_1.test)('the preview names the stages in words and marks the gates', function () {
    var spec = __assign(__assign({}, (0, draft_1.typed)((0, draft_1.blankDraft)(), 'retry checkout')), { flow: 'spec' });
    (0, testing_1.expect)((0, strip_1.stripText)((0, draft_1.preview)(spec), 400)).toEqual([
        '○ Settle decisions ─► ○ Write the spec ◆ ─► ○ Split into tickets ◆ ─► ○ Build the tickets ─► ○ Open the PR ─► ○ Look back',
    ]);
    (0, testing_1.expect)((0, draft_1.preview)(__assign(__assign({}, (0, draft_1.picked)(spec, 'spec')), { openPr: false })).map(function (one) { return one.stage; })).not.toContain('pr');
    (0, testing_1.expect)((0, draft_1.preview)((0, draft_1.picked)((0, draft_1.blankDraft)(), 'freeform'))).toEqual([]);
    (0, testing_1.expect)((0, draft_1.preview)(__assign(__assign({}, (0, draft_1.typed)((0, draft_1.blankDraft)(), 'checkout crashes')), { flow: 'oneshot' })).map(function (one) { return one.label; })).toEqual(['Diagnose', 'Open the PR', 'Look back']);
    (0, testing_1.expect)((0, draft_1.slugPath)((0, draft_1.typed)((0, draft_1.blankDraft)(), 'Retry checkout!'))).toBe('.scratch/retry-checkout/');
    (0, testing_1.expect)((0, draft_1.blocker)((0, draft_1.blankDraft)())).toBe('Describe what to build first.');
    (0, testing_1.expect)((0, draft_1.blocker)((0, draft_1.typed)((0, draft_1.blankDraft)(), 'x'))).toBeUndefined();
});
(0, testing_1.test)('only a bare issue reference is fetched from GitHub', function () {
    (0, testing_1.expect)((0, draft_1.githubRef)('#123')).toBe('123');
    (0, testing_1.expect)((0, draft_1.githubRef)(' https://github.com/o/r/issues/9 ')).toBe('https://github.com/o/r/issues/9');
    (0, testing_1.expect)((0, draft_1.githubRef)('fix #123 today')).toBeUndefined();
    (0, testing_1.expect)((0, draft_1.githubRef)('https://github.com/o/r/pull/9')).toBeUndefined();
    (0, testing_1.expect)((0, draft_1.githubRef)('https://evil.example/o/r/issues/9')).toBeUndefined();
    var ok = { exitCode: 0, stderr: '', stdout: JSON.stringify({ title: 'Retry', body: 'Details', url: 'https://github.com/o/r/issues/9' }) };
    (0, testing_1.expect)((0, draft_1.issueOf)(ok)).toEqual({ title: 'Retry', body: 'Details', url: 'https://github.com/o/r/issues/9' });
    (0, testing_1.expect)((0, draft_1.issueOf)(__assign(__assign({}, ok), { exitCode: 1, stderr: 'no such issue\nmore' }))).toBe('no such issue');
    (0, testing_1.expect)((0, draft_1.issueOf)(__assign(__assign({}, ok), { stdout: 'nope' }))).toBe('gh printed no issue');
    var made = (0, draft_1.createFrom)((0, draft_1.typed)((0, draft_1.blankDraft)(), '#9'), { title: 'Retry', body: 'Details', url: 'u' });
    (0, testing_1.expect)(made).toMatchObject({ text: '#9', title: 'Retry', start: 'ticket', ticket: '# Retry\n\nu\n\nDetails' });
    var named = (0, draft_1.createFrom)(__assign(__assign({}, (0, draft_1.typed)((0, draft_1.blankDraft)(), '#9')), { title: 'Mine' }), { title: 'Retry', body: '', url: 'u' });
    (0, testing_1.expect)(named.title).toBe('Mine');
    (0, testing_1.expect)((0, draft_1.flowOfLabel)('spec: A spec and tickets')).toBe('spec');
    (0, testing_1.expect)((0, draft_1.flowOfLabel)(undefined)).toBeUndefined();
});
