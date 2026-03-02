/* universal AST interpreter - executes JS step by step */
import * as acorn from "acorn";
import type { Snapshot, ArrayState, VariableState, ObjectState } from "./types";

type Scope = Map<string, unknown>;

interface ExecContext {
    snapshots: Snapshot[];
    comparisons: number;
    swaps: number;
    stepCount: number;
    scopes: Scope[];
    trackedArrays: Map<string, number[]>;
    trackedObjects: Map<string, Record<string, unknown>>;
    highlights: number[];
    swapped: number[];
    sorted: number[];
    callStack: string[];
    logs: string[];
    maxSteps: number;
    swapPhase: number;
}

function createContext(maxSteps = 5000): ExecContext {
    return {
        snapshots: [],
        comparisons: 0,
        swaps: 0,
        stepCount: 0,
        scopes: [new Map()],
        trackedArrays: new Map(),
        trackedObjects: new Map(),
        highlights: [],
        swapped: [],
        sorted: [],
        callStack: [],
        logs: [],
        maxSteps,
        swapPhase: 0,
    };
}

function currentScope(ctx: ExecContext): Scope {
    return ctx.scopes[ctx.scopes.length - 1];
}

function lookupVar(ctx: ExecContext, name: string): unknown {
    for (let i = ctx.scopes.length - 1; i >= 0; i--) {
        if (ctx.scopes[i].has(name)) return ctx.scopes[i].get(name);
    }
    return undefined;
}

function setVar(ctx: ExecContext, name: string, value: unknown) {
    for (let i = ctx.scopes.length - 1; i >= 0; i--) {
        if (ctx.scopes[i].has(name)) {
            ctx.scopes[i].set(name, value);
            trackValue(ctx, name, value);
            return;
        }
    }
    currentScope(ctx).set(name, value);
    trackValue(ctx, name, value);
}

// track arrays and objects by name
function trackValue(ctx: ExecContext, name: string, value: unknown) {
    if (Array.isArray(value)) {
        ctx.trackedArrays.set(name, value);
        ctx.trackedObjects.delete(name);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
        ctx.trackedObjects.set(name, value as Record<string, unknown>);
        ctx.trackedArrays.delete(name);
    }
}

function pushScope(ctx: ExecContext) {
    ctx.scopes.push(new Map());
}
function popScope(ctx: ExecContext) {
    if (ctx.scopes.length > 1) ctx.scopes.pop();
}

function getArraySnapshot(ctx: ExecContext): ArrayState[] {
    const arrays: ArrayState[] = [];
    ctx.trackedArrays.forEach((arr, name) => {
        // only track number arrays for visualization
        const nums = arr.map((v) => (typeof v === "number" ? v : 0));
        arrays.push({
            name,
            values: [...nums],
            highlights: [...ctx.highlights],
            swapped: [...ctx.swapped],
            sorted: [...ctx.sorted],
        });
    });
    return arrays;
}

function getObjectSnapshot(ctx: ExecContext): ObjectState[] {
    const objects: ObjectState[] = [];
    const prevSnap = ctx.snapshots[ctx.snapshots.length - 1];
    const prevObjMap = new Map<string, Map<string, unknown>>();
    if (prevSnap) {
        prevSnap.objects.forEach((o) => {
            const m = new Map<string, unknown>();
            o.entries.forEach((e) => m.set(e.key, e.value));
            prevObjMap.set(o.name, m);
        });
    }

    ctx.trackedObjects.forEach((obj, name) => {
        const prevEntries = prevObjMap.get(name);
        const entries = Object.keys(obj).map((key) => ({
            key,
            value: obj[key],
            changed: prevEntries ? prevEntries.get(key) !== obj[key] : true,
        }));
        objects.push({ name, entries });
    });
    return objects;
}

function recordSnapshot(ctx: ExecContext, line: number, desc: string) {
    const variables: VariableState[] = [];
    const seen = new Set<string>();

    for (let i = ctx.scopes.length - 1; i >= 0; i--) {
        ctx.scopes[i].forEach((val, name) => {
            if (seen.has(name)) return;
            seen.add(name);
            if (
                !Array.isArray(val) &&
                typeof val !== "function" &&
                !(val && typeof val === "object")
            ) {
                variables.push({
                    name,
                    value: val,
                    type: typeof val,
                    changed: false,
                });
            }
        });
    }

    const arrays = getArraySnapshot(ctx);
    const objects = getObjectSnapshot(ctx);

    // mark changed vars
    const prevSnap = ctx.snapshots[ctx.snapshots.length - 1];
    if (prevSnap) {
        const prevMap = new Map(
            prevSnap.variables.map((v) => [v.name, v.value]),
        );
        variables.forEach((v) => {
            if (prevMap.has(v.name) && prevMap.get(v.name) !== v.value)
                v.changed = true;
        });
    }

    ctx.snapshots.push({
        step: ctx.stepCount++,
        line,
        variables,
        arrays,
        objects,
        callStack: [...ctx.callStack],
        logs: [...ctx.logs],
        comparisons: ctx.comparisons,
        swaps: ctx.swaps,
        description: desc,
    });

    ctx.highlights = [];
    ctx.swapped = [];
}

// signals
type Signal =
    | { type: "return"; value: unknown }
    | { type: "break" }
    | { type: "continue" }
    | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalNode(node: any, ctx: ExecContext): unknown {
    if (ctx.stepCount >= ctx.maxSteps) return undefined;
    switch (node.type) {
        case "Program":
            for (const stmt of node.body) {
                const sig = evalStatement(stmt, ctx);
                if (sig) return sig;
            }
            return undefined;
        default:
            return evalExpr(node, ctx);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalStatement(node: any, ctx: ExecContext): Signal {
    if (ctx.stepCount >= ctx.maxSteps) return null;

    switch (node.type) {
        case "VariableDeclaration": {
            for (const decl of node.declarations) {
                const val = decl.init ? evalExpr(decl.init, ctx) : undefined;
                const name = decl.id?.type === "Identifier" ? decl.id.name : "?";
                currentScope(ctx).set(name, val);
                trackValue(ctx, name, val);
                recordSnapshot(
                    ctx,
                    node.loc?.start?.line ?? 0,
                    `Declared ${name} = ${formatVal(val)}`,
                );
            }
            return null;
        }

        case "ExpressionStatement": {
            evalExpr(node.expression, ctx);
            recordSnapshot(
                ctx,
                node.loc?.start?.line ?? 0,
                describeExpression(node.expression),
            );
            return null;
        }

        case "ForStatement": {
            if (node.init) {
                if (node.init.type === "VariableDeclaration")
                    evalStatement(node.init, ctx);
                else evalExpr(node.init, ctx);
            }
            while (true) {
                if (ctx.stepCount >= ctx.maxSteps) break;
                if (node.test) {
                    const test = evalExpr(node.test, ctx);
                    recordSnapshot(
                        ctx,
                        node.loc?.start?.line ?? 0,
                        `Loop condition: ${test}`,
                    );
                    if (!test) break;
                }
                const sig = evalBlock(node.body, ctx);
                if (sig?.type === "break") break;
                if (sig?.type === "return") return sig;
                if (node.update) evalExpr(node.update, ctx);
            }
            return null;
        }

        case "WhileStatement": {
            while (true) {
                if (ctx.stepCount >= ctx.maxSteps) break;
                const test = evalExpr(node.test, ctx);
                recordSnapshot(
                    ctx,
                    node.test.loc?.start?.line ?? 0,
                    `While condition: ${test}`,
                );
                if (!test) break;
                const sig = evalBlock(node.body, ctx);
                if (sig?.type === "break") break;
                if (sig?.type === "return") return sig;
            }
            return null;
        }

        case "DoWhileStatement": {
            do {
                if (ctx.stepCount >= ctx.maxSteps) break;
                const sig = evalBlock(node.body, ctx);
                if (sig?.type === "break") break;
                if (sig?.type === "return") return sig;
                const test = evalExpr(node.test, ctx);
                recordSnapshot(
                    ctx,
                    node.test.loc?.start?.line ?? 0,
                    `Do-while condition: ${test}`,
                );
                if (!test) break;
            } while (true);
            return null;
        }

        case "ForInStatement": {
            const obj = evalExpr(node.right, ctx);
            if (obj && typeof obj === "object") {
                for (const key of Object.keys(obj as Record<string, unknown>)) {
                    if (ctx.stepCount >= ctx.maxSteps) break;
                    if (node.left.type === "VariableDeclaration") {
                        const name = node.left.declarations[0]?.id?.name;
                        if (name) {
                            currentScope(ctx).set(name, key);
                            recordSnapshot(ctx, node.loc?.start?.line ?? 0, `for-in: ${name} = ${key}`);
                        }
                    } else if (node.left.type === "Identifier") {
                        setVar(ctx, node.left.name, key);
                    }
                    const sig = evalBlock(node.body, ctx);
                    if (sig?.type === "break") break;
                    if (sig?.type === "return") return sig;
                }
            }
            return null;
        }

        case "ForOfStatement": {
            const iterable = evalExpr(node.right, ctx);
            if (Array.isArray(iterable)) {
                for (const item of iterable) {
                    if (ctx.stepCount >= ctx.maxSteps) break;
                    if (node.left.type === "VariableDeclaration") {
                        const name = node.left.declarations[0]?.id?.name;
                        if (name) {
                            currentScope(ctx).set(name, item);
                            recordSnapshot(ctx, node.loc?.start?.line ?? 0, `for-of: ${name} = ${formatVal(item)}`);
                        }
                    } else if (node.left.type === "Identifier") {
                        setVar(ctx, node.left.name, item);
                    }
                    const sig = evalBlock(node.body, ctx);
                    if (sig?.type === "break") break;
                    if (sig?.type === "return") return sig;
                }
            }
            return null;
        }

        case "IfStatement": {
            const test = evalExpr(node.test, ctx);
            ctx.comparisons++;
            recordSnapshot(
                ctx,
                node.loc?.start?.line ?? 0,
                `If condition: ${test}`,
            );
            if (test) {
                return evalBlock(node.consequent, ctx);
            } else if (node.alternate) {
                return evalBlock(node.alternate, ctx);
            }
            return null;
        }

        case "SwitchStatement": {
            const disc = evalExpr(node.discriminant, ctx);
            let matched = false;
            for (const c of node.cases) {
                if (ctx.stepCount >= ctx.maxSteps) break;
                if (!matched && c.test) {
                    const tv = evalExpr(c.test, ctx);
                    if (tv !== disc) continue;
                    matched = true;
                }
                if (matched || !c.test) {
                    matched = true;
                    for (const stmt of c.consequent) {
                        const sig = evalStatement(stmt, ctx);
                        if (sig?.type === "break") return null;
                        if (sig?.type === "return") return sig;
                    }
                }
            }
            return null;
        }

        case "BlockStatement": {
            pushScope(ctx);
            for (const stmt of node.body) {
                const sig = evalStatement(stmt, ctx);
                if (sig) {
                    popScope(ctx);
                    return sig;
                }
            }
            popScope(ctx);
            return null;
        }

        case "ReturnStatement": {
            const val = node.argument
                ? evalExpr(node.argument, ctx)
                : undefined;
            recordSnapshot(
                ctx,
                node.loc?.start?.line ?? 0,
                `Return: ${formatVal(val)}`,
            );
            return { type: "return", value: val };
        }

        case "BreakStatement":
            return { type: "break" };

        case "ContinueStatement":
            return { type: "continue" };

        case "FunctionDeclaration": {
            const fn = makeFn(node, ctx);
            currentScope(ctx).set(node.id.name, fn);
            return null;
        }

        case "EmptyStatement":
            return null;

        default:
            return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalBlock(node: any, ctx: ExecContext): Signal {
    return evalStatement(node, ctx);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFn(node: any, ctx: ExecContext) {
    const fnName = node.id?.name || "anonymous";
    const closureScopes = ctx.scopes.map((s) => new Map(s));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
        const savedScopes = ctx.scopes;
        ctx.scopes = [...closureScopes, new Map()];
        const scope = currentScope(ctx);
        const line = node.body?.loc?.start?.line ?? 0;
        ctx.callStack.push(`${fnName}:${line}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.params.forEach((p: any, i: number) => {
            if (p.type === "Identifier") {
                const val = args[i];
                scope.set(p.name, val);
                trackValue(ctx, p.name, val);
            }
        });
        const sig = evalBlock(node.body, ctx);
        ctx.callStack.pop();
        ctx.scopes = savedScopes;
        if (sig?.type === "return") return sig.value;
        return undefined;
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalExpr(node: any, ctx: ExecContext): any {
    if (ctx.stepCount >= ctx.maxSteps) return undefined;

    switch (node.type) {
        case "Literal":
            return node.value;

        case "Identifier": {
            if (node.name === "undefined") return undefined;
            if (node.name === "Infinity") return Infinity;
            if (node.name === "NaN") return NaN;
            return lookupVar(ctx, node.name);
        }

        case "ArrayExpression":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return node.elements.map((el: any) =>
                el ? evalExpr(el, ctx) : undefined,
            );

        case "ObjectExpression": {
            const obj: Record<string, unknown> = {};
            for (const prop of node.properties) {
                const key = prop.key.type === "Identifier" ? prop.key.name : evalExpr(prop.key, ctx);
                obj[key] = evalExpr(prop.value, ctx);
            }
            return obj;
        }

        case "BinaryExpression":
        case "LogicalExpression": {
            const left = evalExpr(node.left, ctx);
            // short circuit for logical
            if (node.type === "LogicalExpression") {
                if (node.operator === "&&" && !left) return left;
                if (node.operator === "||" && left) return left;
                if (node.operator === "??") return left ?? evalExpr(node.right, ctx);
            }
            const right = evalExpr(node.right, ctx);

            // highlight array comparisons
            if (
                ["<", ">", "<=", ">=", "===", "!==", "==", "!="].includes(
                    node.operator,
                )
            ) {
                if (
                    node.left.type === "MemberExpression" &&
                    node.right.type === "MemberExpression"
                ) {
                    const li = evalExpr(node.left.property, ctx);
                    const ri = evalExpr(node.right.property, ctx);
                    if (typeof li === "number" && typeof ri === "number") {
                        ctx.highlights = [li, ri];
                    }
                }
            }

            return applyBinaryOp(node.operator, left, right);
        }

        case "UnaryExpression": {
            const arg = evalExpr(node.argument, ctx);
            switch (node.operator) {
                case "-": return -arg;
                case "!": return !arg;
                case "+": return +arg;
                case "typeof": return typeof arg;
                case "~": return ~arg;
                case "void": return undefined;
                default: return undefined;
            }
        }

        case "UpdateExpression": {
            const val = evalExpr(node.argument, ctx) as number;
            const newVal = node.operator === "++" ? val + 1 : val - 1;
            assignToNode(node.argument, newVal, ctx);
            return node.prefix ? newVal : val;
        }

        case "AssignmentExpression": {
            let val = evalExpr(node.right, ctx);
            if (node.operator !== "=") {
                const cur = evalExpr(node.left, ctx);
                val = applyBinaryOp(node.operator.slice(0, -1), cur, val);
            }

            // detect array element writes for swap highlighting
            if (
                node.left.type === "MemberExpression" &&
                node.left.object.type === "Identifier"
            ) {
                const idx = evalExpr(node.left.property, ctx);
                if (typeof idx === "number") ctx.swapped.push(idx);
            }

            assignToNode(node.left, val, ctx);

            // detect swap pattern
            if (isSwapAssignment(node)) {
                ctx.swapPhase++;
                if (ctx.swapPhase >= 3) {
                    ctx.swaps++;
                    ctx.swapPhase = 0;
                }
            } else if (
                node.left.type === "MemberExpression" &&
                node.left.object.type === "Identifier"
            ) {
                ctx.swapPhase++;
                if (ctx.swapPhase >= 3) {
                    ctx.swaps++;
                    ctx.swapPhase = 0;
                }
            } else {
                if (
                    node.left.type === "Identifier" &&
                    node.right.type !== "MemberExpression"
                ) {
                    ctx.swapPhase = 0;
                }
            }

            return val;
        }

        case "MemberExpression": {
            const obj = evalExpr(node.object, ctx);
            const prop = node.computed
                ? evalExpr(node.property, ctx)
                : node.property.name;
            if (obj == null) return undefined;

            // array properties and methods
            if (Array.isArray(obj)) {
                if (prop === "length") return obj.length;
                if (typeof prop === "number") return obj[prop];
                // array methods
                switch (prop) {
                    case "push": return (...a: unknown[]) => { obj.push(...a); return obj.length; };
                    case "pop": return () => obj.pop();
                    case "shift": return () => obj.shift();
                    case "unshift": return (...a: unknown[]) => { obj.unshift(...a); return obj.length; };
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "splice": return (...a: unknown[]) => (obj.splice as (...args: any[]) => any)(...a);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "slice": return (...a: unknown[]) => (obj.slice as (...args: any[]) => any)(...a);
                    case "indexOf": return (v: unknown) => obj.indexOf(v as never);
                    case "includes": return (v: unknown) => obj.includes(v as never);
                    case "concat": return (...a: unknown[]) => obj.concat(...a);
                    case "reverse": return () => { obj.reverse(); return obj; };
                    case "join": return (s?: string) => obj.join(s);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "map": return (fn: (...args: any[]) => any) => obj.map((v, i) => fn(v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "filter": return (fn: (...args: any[]) => any) => obj.filter((v, i) => fn(v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "forEach": return (fn: (...args: any[]) => any) => { obj.forEach((v, i) => fn(v, i)); };
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "reduce": return (fn: (...args: any[]) => any, init: unknown) =>
                        init !== undefined ? obj.reduce((a, v, i) => fn(a, v, i), init) : obj.reduce((a, v, i) => fn(a, v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "find": return (fn: (...args: any[]) => any) => obj.find((v, i) => fn(v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "findIndex": return (fn: (...args: any[]) => any) => obj.findIndex((v, i) => fn(v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "some": return (fn: (...args: any[]) => any) => obj.some((v, i) => fn(v, i));
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "every": return (fn: (...args: any[]) => any) => obj.every((v, i) => fn(v, i));
                    case "flat": return () => obj.flat();
                    case "fill": return (v: unknown, s?: number, e?: number) => obj.fill(v as never, s, e);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    case "sort": return (fn?: (...args: any[]) => any) => fn ? obj.sort((a, b) => fn(a, b)) : obj.sort();
                }
            }

            // string methods
            if (typeof obj === "string") {
                if (prop === "length") return obj.length;
                switch (prop) {
                    case "charAt": return (i: number) => obj.charAt(i);
                    case "charCodeAt": return (i: number) => obj.charCodeAt(i);
                    case "indexOf": return (s: string) => obj.indexOf(s);
                    case "includes": return (s: string) => obj.includes(s);
                    case "slice": return (s: number, e?: number) => obj.slice(s, e);
                    case "substring": return (s: number, e?: number) => obj.substring(s, e);
                    case "split": return (s: string) => obj.split(s);
                    case "toLowerCase": return () => obj.toLowerCase();
                    case "toUpperCase": return () => obj.toUpperCase();
                    case "trim": return () => obj.trim();
                    case "replace": return (a: string, b: string) => obj.replace(a, b);
                    case "repeat": return (n: number) => obj.repeat(n);
                    case "startsWith": return (s: string) => obj.startsWith(s);
                    case "endsWith": return (s: string) => obj.endsWith(s);
                }
                if (typeof prop === "number") return obj[prop];
            }

            return (obj as Record<string, unknown>)[prop];
        }

        case "CallExpression": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const args = node.arguments.map((a: any) => evalExpr(a, ctx));

            // Math.*
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "Math"
            ) {
                const method = node.callee.property.name;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (typeof (Math as any)[method] === "function") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (Math as any)[method](...args);
                }
            }

            // console.log
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "console"
            ) {
                ctx.logs.push(args.map(formatVal).join(" "));
                return undefined;
            }

            // Object.keys / Object.values / Object.entries
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "Object"
            ) {
                const m = node.callee.property.name;
                if (m === "keys" && args[0]) return Object.keys(args[0]);
                if (m === "values" && args[0]) return Object.values(args[0]);
                if (m === "entries" && args[0]) return Object.entries(args[0]);
                if (m === "assign") return Object.assign({}, ...args);
            }

            // Number(), String(), Boolean(), parseInt, parseFloat, isNaN, isFinite
            if (node.callee.type === "Identifier") {
                switch (node.callee.name) {
                    case "Number": return Number(args[0]);
                    case "String": return String(args[0]);
                    case "Boolean": return Boolean(args[0]);
                    case "parseInt": return parseInt(args[0], args[1]);
                    case "parseFloat": return parseFloat(args[0]);
                    case "isNaN": return isNaN(args[0]);
                    case "isFinite": return isFinite(args[0]);
                    case "Array": return new Array(args[0]);
                }
            }

            // Array.isArray
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "Array" &&
                node.callee.property.name === "isArray"
            ) {
                return Array.isArray(args[0]);
            }

            // JSON.stringify / JSON.parse
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "JSON"
            ) {
                if (node.callee.property.name === "stringify") return JSON.stringify(args[0]);
                if (node.callee.property.name === "parse") return JSON.parse(args[0]);
            }

            const callee = evalExpr(node.callee, ctx);
            if (typeof callee === "function") return callee(...args);
            return undefined;
        }

        case "ConditionalExpression": {
            return evalExpr(node.test, ctx)
                ? evalExpr(node.consequent, ctx)
                : evalExpr(node.alternate, ctx);
        }

        case "SequenceExpression": {
            let result;
            for (const expr of node.expressions) result = evalExpr(expr, ctx);
            return result;
        }

        case "ArrowFunctionExpression":
        case "FunctionExpression": {
            return makeFn(
                { ...node, id: node.id || { name: "anonymous" } },
                ctx,
            );
        }

        case "TemplateLiteral": {
            let result = "";
            for (let i = 0; i < node.quasis.length; i++) {
                result += node.quasis[i].value.cooked;
                if (i < node.expressions.length) {
                    result += String(evalExpr(node.expressions[i], ctx));
                }
            }
            return result;
        }

        case "SpreadElement":
            return evalExpr(node.argument, ctx);

        case "NewExpression": {
            // new Map(), new Set(), new Array() — simplified
            if (node.callee.type === "Identifier") {
                if (node.callee.name === "Array") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const args = node.arguments.map((a: any) => evalExpr(a, ctx));
                    return new Array(args[0]);
                }
                if (node.callee.name === "Map") return {};
                if (node.callee.name === "Set") return {};
            }
            return {};
        }

        case "ThisExpression":
            return undefined;

        default:
            return undefined;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSwapAssignment(node: any): boolean {
    if (
        node.left.type === "Identifier" &&
        node.right.type === "MemberExpression"
    ) {
        return true;
    }
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignToNode(node: any, value: unknown, ctx: ExecContext) {
    if (node.type === "Identifier") {
        setVar(ctx, node.name, value);
    } else if (node.type === "MemberExpression") {
        const obj = evalExpr(node.object, ctx);
        const prop = node.computed
            ? evalExpr(node.property, ctx)
            : node.property.name;
        if (obj != null) {
            (obj as Record<string, unknown>)[prop] = value;
            // sync tracking
            if (node.object.type === "Identifier") {
                if (Array.isArray(obj)) {
                    ctx.trackedArrays.set(node.object.name, obj);
                } else if (typeof obj === "object") {
                    ctx.trackedObjects.set(
                        node.object.name,
                        obj as Record<string, unknown>,
                    );
                }
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBinaryOp(op: string, left: any, right: any): any {
    switch (op) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return left / right;
        case "%": return left % right;
        case "**": return left ** right;
        case "<": return left < right;
        case ">": return left > right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        case "===": return left === right;
        case "!==": return left !== right;
        case "==": return left == right;
        case "!=": return left != right;
        case "&&": return left && right;
        case "||": return left || right;
        case "??": return left ?? right;
        case "&": return left & right;
        case "|": return left | right;
        case "^": return left ^ right;
        case "<<": return left << right;
        case ">>": return left >> right;
        case ">>>": return left >>> right;
        case "in": return left in right;
        case "instanceof": return false;
        default: return undefined;
    }
}

function formatVal(v: unknown): string {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (Array.isArray(v)) return `[${v.join(", ")}]`;
    if (typeof v === "object") {
        try { return JSON.stringify(v); } catch { return "{...}"; }
    }
    return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeExpression(node: any): string {
    if (node.type === "AssignmentExpression") {
        if (node.left.type === "Identifier") return `Assigned ${node.left.name}`;
        if (node.left.type === "MemberExpression") return "Array/Object assignment";
        return "Assignment";
    }
    if (node.type === "CallExpression") {
        if (node.callee.type === "Identifier") return `Called ${node.callee.name}()`;
        if (node.callee.type === "MemberExpression") {
            const m = node.callee.property?.name || "";
            return `Called .${m}()`;
        }
        return "Function call";
    }
    if (node.type === "UpdateExpression") {
        const name = node.argument?.name || "";
        return `${name}${node.operator}`;
    }
    return "Expression evaluated";
}

/**
 * Universal entry: parse and execute JS, returning step snapshots
 */
export function executeCode(code: string): Snapshot[] {
    const ast = acorn.parse(code, {
        ecmaVersion: 2020,
        sourceType: "script",
        locations: true,
    });

    const ctx = createContext();
    evalNode(ast, ctx);

    // mark final sorted state on arrays
    if (ctx.snapshots.length > 0) {
        const last = ctx.snapshots[ctx.snapshots.length - 1];
        last.arrays.forEach((a) => {
            a.sorted = a.values.map((_, i) => i);
        });
    }

    return ctx.snapshots;
}
