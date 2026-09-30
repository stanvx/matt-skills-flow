"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHY = exports.stageLabel = exports.STAGE_LABEL = exports.STATUS_LABEL = exports.MODELS = exports.EFFORTS = exports.commandOf = exports.COMMAND_OF = exports.ONRAMP = exports.LEGACY_FLOW = exports.FLOW_OF = exports.FLOWS = exports.FLOW_NAMES = void 0;
/** Smallest first: a task grows along this order, and never into freeform. */
exports.FLOW_NAMES = ['oneshot', 'grill', 'spec', 'wayfind', 'freeform'];
exports.FLOWS = {
    oneshot: {
        label: 'Oneshot',
        blurb: 'The ticket says enough: build it, then open the PR',
        stages: ['implement', 'pr', 'retro'],
    },
    grill: {
        label: 'Grill',
        blurb: 'Settle the decisions, then build in one session',
        stages: ['grill-with-docs', 'implement', 'pr', 'retro'],
    },
    spec: {
        label: 'Spec',
        blurb: 'A spec and tickets you approve, built across sessions',
        stages: ['grill-with-docs', 'to-spec', 'to-tickets', 'implement-spec', 'pr', 'retro'],
    },
    wayfind: {
        label: 'Wayfind',
        blurb: 'Too big and foggy for one session: chart a map of decisions, clear it, then spec the way',
        stages: ['wayfinder', 'wayfinder-clear', 'to-spec', 'to-tickets', 'implement-spec', 'pr', 'retro'],
    },
    freeform: {
        label: 'Freeform',
        blurb: 'No fixed phases: run any skill, each one is recorded',
        stages: [],
    },
};
/** The flow a new task gets when nobody picks one. */
exports.FLOW_OF = { ticket: 'oneshot', broken: 'oneshot', idea: 'grill', foggy: 'wayfind' };
/** The flow a task written before flows existed was on: its old rail was the spec flow, or the map for a foggy one. */
exports.LEGACY_FLOW = { ticket: 'oneshot', broken: 'oneshot', idea: 'spec', foggy: 'wayfind' };
/** On-ramps: the stage that replaces a flow's first one for a task that joins there. */
exports.ONRAMP = { broken: 'diagnosing-bugs' };
/** Stages another skill runs: clearing the map is /wayfinder again, with the map. */
exports.COMMAND_OF = { 'wayfinder-clear': 'wayfinder' };
var commandOf = function (stage) { var _a; return (_a = exports.COMMAND_OF[stage]) !== null && _a !== void 0 ? _a : stage; };
exports.commandOf = commandOf;
exports.EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
/** The models a task can pick by alias; a turn step needs the full id. */
// ponytail: the current family by hand; refresh when a model ships, or read the engine's list if one appears.
exports.MODELS = [
    { alias: 'fable', id: 'claude-fable-5-1', label: 'Fable 5.1' },
    { alias: 'opus', id: 'claude-opus-5-5', label: 'Opus 5.5' },
    { alias: 'sonnet', id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
    { alias: 'haiku', id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];
exports.STATUS_LABEL = {
    working: 'Working',
    waiting: 'Waiting for you',
    ready: 'Ready',
    done: 'Done',
};
/** Each stage in words, as the strip, the pane and the board name it; the skill stays the command. */
exports.STAGE_LABEL = {
    'grill-with-docs': 'Settle decisions',
    wayfinder: 'Chart the map',
    'wayfinder-clear': 'Clear the map',
    'diagnosing-bugs': 'Diagnose',
    'to-spec': 'Write the spec',
    'to-tickets': 'Split into tickets',
    implement: 'Build',
    'implement-spec': 'Build the tickets',
    pr: 'Open the PR',
    retro: 'Look back',
};
var stageLabel = function (stage) { var _a; return (_a = exports.STAGE_LABEL[stage]) !== null && _a !== void 0 ? _a : stage; };
exports.stageLabel = stageLabel;
/** Why each stage is the next one, as the band and the pane say it. */
exports.WHY = {
    'grill-with-docs': 'sharpen the idea and settle the decisions first',
    implement: 'build it here, in this session',
    'to-spec': 'multi-session: spec it before any /clear. One session? /implement here',
    'to-tickets': 'split the spec into tracer-bullet tickets',
    'implement-spec': 'build the whole graph, or /clear and /implement one ticket at a time',
    pr: 'open the pull request, with the checks as evidence',
    retro: 'look back before you /clear; more tickets? /implement next',
    'diagnosing-bugs': 'reproduce it first, then fix it with a regression test',
    wayfinder: 'name the destination and chart the decisions ahead',
    'wayfinder-clear': 'clear the map: one frontier ticket per session, /clear between',
};
