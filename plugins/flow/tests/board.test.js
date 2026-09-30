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
var board_1 = require("../hooks/board");
var flow_1 = require("../hooks/flow");
(0, testing_1.test)('the board document carries the flow, status and PR choice', function () {
    var task = (0, flow_1.createTask)('Retry checkout', 1, { flow: 'spec', openPr: false });
    var doc = (0, board_1.boardDoc)(task, 'shop', 9);
    (0, testing_1.expect)(doc).toMatchObject({ flow: 'spec', status: 'ready', openPr: false });
    (0, testing_1.expect)(doc).not.toHaveProperty('model');
    (0, testing_1.expect)(doc).not.toHaveProperty('effort');
});
(0, testing_1.test)('the board document says when a person is waited on, and when the task is done', function () {
    var writing = (0, flow_1.recordSkill)((0, flow_1.createTask)('Retry checkout', 1, { flow: 'spec' }), 'to-spec', 2);
    var specced = (0, flow_1.recordArtifact)(writing, '.scratch/retry-checkout/spec.md', 3);
    (0, testing_1.expect)((0, board_1.boardDoc)(writing, 'shop', 9).status).toBe('ready');
    (0, testing_1.expect)((0, board_1.boardDoc)(specced, 'shop', 9).status).toBe('waiting');
    (0, testing_1.expect)((0, board_1.boardDoc)((0, flow_1.approvePhase)(specced, 4), 'shop', 9).status).toBe('ready');
    (0, testing_1.expect)((0, board_1.boardDoc)(__assign(__assign({}, specced), { closedAt: 8 }), 'shop', 9).status).toBe('done');
});
(0, testing_1.test)('the board document carries the model and effort when they are set', function () {
    var task = (0, flow_1.createTask)('Retry checkout', 1, { model: 'opus', effort: 'high' });
    (0, testing_1.expect)((0, board_1.boardDoc)(task, 'shop', 9)).toMatchObject({ model: 'opus', effort: 'high', openPr: true });
});
