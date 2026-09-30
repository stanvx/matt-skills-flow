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
exports.registerQuickbar = exports.barCommand = exports.parseAdd = exports.slashOf = exports.labelOf = exports.rowOf = exports.bandKeys = exports.defaults = exports.parsePhrases = exports.BAR_KEY = void 0;
var flow_1 = require("./flow");
exports.BAR_KEY = 'bar';
var MAX_PHRASES = 9;
var MAX_DEFAULTS = 4;
var MAX_TEXT = 500;
var MAX_LABEL = 24;
var SHOWN = 28;
var BUILD = ['implement', 'implement-spec', 'diagnosing-bugs'];
var USAGE = 'Usage: /flow bar [add [--fill] [--label <label>] <text> | rm <n> | clear]';
var isPhrase = function (value) {
    return typeof value === 'object' &&
        value !== null &&
        'text' in value &&
        typeof value.text === 'string' &&
        value.text !== '' &&
        'mode' in value &&
        (value.mode === 'send' || value.mode === 'fill') &&
        (!('label' in value) || value.label === undefined || typeof value.label === 'string');
};
/** The saved phrases as the store holds them; anything malformed is dropped. */
var parsePhrases = function (value) { return (Array.isArray(value) ? value.filter(isPhrase).slice(0, MAX_PHRASES) : []); };
exports.parsePhrases = parsePhrases;
/** Up to four buttons the open task's phase calls for, and `/clear` once the context is full. */
var defaults = function (task, percent, clearAt) {
    if (task === null) {
        return [];
    }
    var byPhase = (0, flow_1.isWaiting)(task)
        ? ['/flow doc']
        : task.phase === 'wayfinder' || task.phase === 'wayfinder-clear'
            ? ['/clear']
            : flow_1.PLANNING.includes(task.phase)
                ? ['continue']
                : BUILD.includes(task.phase)
                    ? ['continue', '/code-review', 'run the checks']
                    : [];
    // The step a person may take instead of the next one: `Map is clear` while clearing a map.
    var alt = (0, flow_1.nextAction)(task).alt;
    var texts = __spreadArray([], new Set(__spreadArray(__spreadArray([], byPhase, true), (percent >= clearAt ? ['/clear'] : []), true)), true);
    return __spreadArray(__spreadArray([], (alt === undefined ? [] : [{ text: "/".concat(alt.command), label: alt.label, mode: 'send' }]), true), texts.map(function (text) { return (__assign({ text: text, mode: 'send' }, (text === '/flow doc' && flow_1.GATED[task.phase] !== undefined ? { label: "Read the ".concat(flow_1.GATED[task.phase]) } : {}))); }), true).slice(0, MAX_DEFAULTS);
};
exports.defaults = defaults;
/** Digit keys the band takes: 1 for the next step unless a gate waits (approving takes a focused n), then one per default. */
var bandKeys = function (task, percent, clearAt) {
    return task === null ? 0 : ((0, flow_1.isWaiting)(task) ? 0 : 1) + (0, exports.defaults)(task, percent, clearAt).length;
};
exports.bandKeys = bandKeys;
/** The row under the band: saved phrases the defaults do not repeat, in the keys the band leaves. */
var rowOf = function (task, saved, percent, clearAt) {
    var base = (0, exports.defaults)(task, percent, clearAt);
    return saved.filter(function (one) { return !base.some(function (known) { return known.text === one.text; }); }).slice(0, MAX_PHRASES - (0, exports.bandKeys)(task, percent, clearAt));
};
exports.rowOf = rowOf;
/** What a button says; a fill button ends in an ellipsis because the person finishes it. */
var labelOf = function (phrase) {
    var _a;
    var shown = (_a = phrase.label) !== null && _a !== void 0 ? _a : phrase.text;
    var cut = shown.length > SHOWN ? "".concat(shown.slice(0, SHOWN - 1), "\u2026") : shown;
    return phrase.mode === 'fill' && !cut.endsWith('…') ? "".concat(cut, "\u2026") : cut;
};
exports.labelOf = labelOf;
/** `/code-review foo` as a command and its arguments; undefined for prose. */
var slashOf = function (text) {
    var _a, _b;
    var found = /^\/(\S+)\s*([\s\S]*)$/.exec(text);
    return found === null ? undefined : { command: (_a = found[1]) !== null && _a !== void 0 ? _a : '', args: (_b = found[2]) !== null && _b !== void 0 ? _b : '' };
};
exports.slashOf = slashOf;
/** `add`'s arguments: leading --fill and --label "<label>" flags, then the text. */
var parseAdd = function (input, mode, label) {
    var _a;
    if (mode === void 0) { mode = 'send'; }
    var text = input.trim();
    var fill = /^--fill(?:\s+|$)/.exec(text);
    if (fill !== null) {
        return (0, exports.parseAdd)(text.slice(fill[0].length), 'fill', label);
    }
    var named = /^--label\s+(?:"([^"]+)"|(\S+))(?:\s+|$)/.exec(text);
    if (named !== null) {
        return (0, exports.parseAdd)(text.slice(named[0].length), mode, (_a = named[1]) !== null && _a !== void 0 ? _a : named[2]);
    }
    if (text.startsWith('--')) {
        var flag = text.split(/\s/)[0];
        return flag === '--label' ? '--label needs a label.' : "".concat(flag, " is not an option.");
    }
    if (text === '') {
        return 'Nothing to save.';
    }
    if (text.length > MAX_TEXT) {
        return "Keep a phrase under ".concat(MAX_TEXT, " characters.");
    }
    if (label !== undefined && label.length > MAX_LABEL) {
        return "Keep a label under ".concat(MAX_LABEL, " characters.");
    }
    return __assign({ text: text, mode: mode }, (label === undefined ? {} : { label: label }));
};
exports.parseAdd = parseAdd;
/** `/flow bar <args>` on the saved phrases: the answer, and the phrases to keep when they change. */
var barCommand = function (saved, args) {
    var _a;
    var _b = (_a = /^(\S*)\s*([\s\S]*)$/.exec(args.trim())) !== null && _a !== void 0 ? _a : [], _c = _b[1], sub = _c === void 0 ? '' : _c, _d = _b[2], arg = _d === void 0 ? '' : _d;
    if (sub === '') {
        return {
            text: saved.length === 0
                ? "No saved phrases.\n".concat(USAGE)
                : saved
                    .map(function (one, at) { return "".concat(at + 1, ". ").concat(one.text).concat(one.mode === 'fill' ? '  (fill)' : '').concat(one.label === undefined ? '' : "  as \"".concat(one.label, "\"")); })
                    .join('\n'),
        };
    }
    if (sub === 'add') {
        var phrase_1 = (0, exports.parseAdd)(arg);
        if (typeof phrase_1 === 'string') {
            return { text: "".concat(phrase_1, "\n").concat(USAGE) };
        }
        if (saved.length >= MAX_PHRASES) {
            return { text: "Already ".concat(MAX_PHRASES, " saved phrases. /flow bar rm <n> first.") };
        }
        if (saved.some(function (one) { return one.text === phrase_1.text; })) {
            return { text: "Already saved: ".concat(phrase_1.text) };
        }
        return { text: "Saved ".concat(saved.length + 1, ": ").concat(phrase_1.text), phrases: __spreadArray(__spreadArray([], saved, true), [phrase_1], false) };
    }
    if (sub === 'rm') {
        var at_1 = /^\d+$/.test(arg.trim()) ? Number(arg.trim()) : 0;
        var gone = saved[at_1 - 1];
        if (gone === undefined) {
            return { text: "No phrase ".concat(arg.trim() || '(none given)', ". /flow bar lists them.") };
        }
        return { text: "Removed ".concat(at_1, ": ").concat(gone.text), phrases: saved.filter(function (_one, index) { return index !== at_1 - 1; }) };
    }
    if (sub === 'clear') {
        return { text: saved.length === 0 ? 'No saved phrases.' : "Removed ".concat(saved.length, " phrase").concat(saved.length === 1 ? '' : 's', "."), phrases: [] };
    }
    return { text: USAGE };
};
exports.barCommand = barCommand;
var registerQuickbar = function (on) {
    on('command.run', { command: 'flow' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, verb, _c, rest, answer, _d, _e;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _a = (_f = /^(\S*)\s*([\s\S]*)$/.exec(e.args.trim())) !== null && _f !== void 0 ? _f : [], _b = _a[1], verb = _b === void 0 ? '' : _b, _c = _a[2], rest = _c === void 0 ? '' : _c;
                    if (verb !== 'bar') {
                        return [2 /*return*/, next(e)];
                    }
                    _d = exports.barCommand;
                    _e = exports.parsePhrases;
                    return [4 /*yield*/, $.store.get(exports.BAR_KEY)];
                case 1:
                    answer = _d.apply(void 0, [_e.apply(void 0, [_g.sent()]), rest]);
                    if (!(answer.phrases !== undefined)) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.store.set(exports.BAR_KEY, answer.phrases)];
                case 2:
                    _g.sent();
                    $.ui.invalidate('ui.render');
                    _g.label = 3;
                case 3: return [2 /*return*/, { text: answer.text }];
            }
        });
    }); });
};
exports.registerQuickbar = registerQuickbar;
