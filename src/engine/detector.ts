/* algorithm detection — lookup by questionId + AST fallback */
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import type { AlgorithmInfo } from "./types";
import { ALGORITHM_DATA } from "@/data/algorithms";

// build lookup from questionId → AlgorithmInfo
const QUESTION_INFO: Record<string, AlgorithmInfo> = {};

// category → complexity mapping
const CATEGORY_DEFAULTS: Record<string, { time: { best: string; average: string; worst: string }; space: string }> = {
    "Arrays & Hashing": { time: { best: "O(n)", average: "O(n)", worst: "O(n²)" }, space: "O(n)" },
    "Advanced Matrix": { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
    "Binary Search Variants": { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
    "Sorting Algorithms": { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
    "Recursion & Backtracking": { time: { best: "O(n)", average: "O(2ⁿ)", worst: "O(n!)" }, space: "O(n)" },
    "Stack Algorithms": { time: { best: "O(n)", average: "O(n)", worst: "O(n²)" }, space: "O(n)" },
    "Linked List": { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(1)" },
    "Tree Algorithms": { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(h)" },
    "Binary Search Tree": { time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" }, space: "O(h)" },
    "Graph Algorithms": { time: { best: "O(V+E)", average: "O(V+E)", worst: "O(V²)" }, space: "O(V)" },
    "Dynamic Programming": { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
    "Greedy Algorithms": { time: { best: "O(n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(1)" },
    "String Algorithms": { time: { best: "O(n)", average: "O(n)", worst: "O(n²)" }, space: "O(n)" },
    "Heap Algorithms": { time: { best: "O(n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(1)" },
    "Graph Traversals": { time: { best: "O(V+E)", average: "O(V+E)", worst: "O(V+E)" }, space: "O(V)" },
    "Advanced Cache": { time: { best: "O(1)", average: "O(1)", worst: "O(n)" }, space: "O(n)" },
};

// specific known complexities
const KNOWN_COMPLEXITY: Record<string, { time: { best: string; average: string; worst: string }; space: string }> = {
    "bubble-sort": { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
    "selection-sort": { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
    "insertion-sort": { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
    "quick-sort": { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" }, space: "O(log n)" },
    "counting-sort": { time: { best: "O(n+k)", average: "O(n+k)", worst: "O(n+k)" }, space: "O(k)" },
    "heap-sort": { time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, space: "O(1)" },
    "binary-search": { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(1)" },
    "lis": { time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, space: "O(n)" },
    "kadanes": { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(1)" },
    "fib-dp": { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
    "dijkstra": { time: { best: "O(V²)", average: "O(V²)", worst: "O(V²)" }, space: "O(V)" },
    "lru-cache": { time: { best: "O(1)", average: "O(1)", worst: "O(n)" }, space: "O(n)" },
    "trapping-rain": { time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, space: "O(1)" },
};

// init lookup table
ALGORITHM_DATA.forEach((cat) => {
    cat.questions.forEach((q) => {
        const known = KNOWN_COMPLEXITY[q.id];
        const defaults = CATEGORY_DEFAULTS[cat.name] || { time: { best: "—", average: "—", worst: "—" }, space: "—" };
        const complexity = known || defaults;
        QUESTION_INFO[q.id] = {
            name: q.name,
            category: cat.name,
            timeComplexity: complexity.time,
            spaceComplexity: complexity.space,
            description: `${q.name} — ${cat.name} (${q.difficulty === "E" ? "Easy" : q.difficulty === "M" ? "Medium" : "Hard"})`,
        };
    });
});

/** fast lookup by question id */
export function detectByQuestionId(id: string): AlgorithmInfo | null {
    return QUESTION_INFO[id] || null;
}

// AST features for fallback detection
interface ASTFeatures {
    hasNestedLoops: boolean;
    maxLoopDepth: number;
    hasSwap: boolean;
    hasRecursion: boolean;
    hasDivideAndConquer: boolean;
    hasCompareAndSwap: boolean;
    mainFnName: string;
    loopCount: number;
    hasMidCalc: boolean;
    hasMinTracker: boolean;
    hasMerge: boolean;
    hasPartition: boolean;
    hasPivot: boolean;
    hasHeapify: boolean;
    hasInsertionShift: boolean;
}

function extractFeatures(code: string): ASTFeatures {
    const ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: "script", locations: true });
    const features: ASTFeatures = {
        hasNestedLoops: false, maxLoopDepth: 0, hasSwap: false, hasRecursion: false,
        hasDivideAndConquer: false, hasCompareAndSwap: false, mainFnName: "", loopCount: 0,
        hasMidCalc: false, hasMinTracker: false, hasMerge: false, hasPartition: false,
        hasPivot: false, hasHeapify: false, hasInsertionShift: false,
    };
    let currentLoopDepth = 0;
    const functionNames = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walk.ancestor(ast as any, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        FunctionDeclaration(node: any) {
            if (node.id?.name) {
                functionNames.add(node.id.name);
                if (!features.mainFnName) features.mainFnName = node.id.name;
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ForStatement(node: any, ancestors: any[]) {
            features.loopCount++;
            currentLoopDepth = 0;
            for (const anc of ancestors) {
                if (anc === node) continue;
                if (["ForStatement", "WhileStatement", "DoWhileStatement"].includes(anc.type)) currentLoopDepth++;
            }
            if (currentLoopDepth > 0) features.hasNestedLoops = true;
            features.maxLoopDepth = Math.max(features.maxLoopDepth, currentLoopDepth + 1);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WhileStatement(node: any, ancestors: any[]) {
            features.loopCount++;
            currentLoopDepth = 0;
            for (const anc of ancestors) {
                if (anc === node) continue;
                if (["ForStatement", "WhileStatement", "DoWhileStatement"].includes(anc.type)) currentLoopDepth++;
            }
            if (currentLoopDepth > 0) features.hasNestedLoops = true;
            features.maxLoopDepth = Math.max(features.maxLoopDepth, currentLoopDepth + 1);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        CallExpression(node: any) {
            if (node.callee.type === "Identifier" && functionNames.has(node.callee.name)) features.hasRecursion = true;
        },
    });

    const lowerCode = code.toLowerCase();
    features.hasSwap = /temp\s*=\s*arr|tmp\s*=\s*arr|\[.*\]\s*=\s*\[/.test(code) || lowerCode.includes("swap");
    features.hasMidCalc = lowerCode.includes("mid") && (lowerCode.includes("math.floor") || /\>\>\s*1/.test(code) || /\/\s*2/.test(code));
    features.hasMinTracker = lowerCode.includes("min") && features.hasNestedLoops;
    features.hasMerge = lowerCode.includes("merge") && features.hasRecursion;
    features.hasPartition = lowerCode.includes("partition") || lowerCode.includes("pivot");
    features.hasPivot = lowerCode.includes("pivot");
    features.hasHeapify = lowerCode.includes("heapify");
    features.hasInsertionShift = /while\s*\(.*j.*>=?\s*0/.test(code) && features.hasSwap;
    features.hasCompareAndSwap = features.hasSwap && features.hasNestedLoops;
    features.hasDivideAndConquer = features.hasRecursion && features.hasMidCalc;
    return features;
}

const ALGORITHMS: { match: (f: ASTFeatures) => boolean; info: AlgorithmInfo }[] = [
    { match: (f) => f.hasHeapify, info: { name: "Heap Sort", category: "Sorting", timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, spaceComplexity: "O(1)", description: "Builds a max heap and repeatedly extracts the maximum element." } },
    { match: (f) => f.hasMerge && f.hasRecursion, info: { name: "Merge Sort", category: "Sorting", timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" }, spaceComplexity: "O(n)", description: "Divides array in half recursively, then merges sorted halves." } },
    { match: (f) => (f.hasPartition || f.hasPivot) && f.hasRecursion, info: { name: "Quick Sort", category: "Sorting", timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" }, spaceComplexity: "O(log n)", description: "Selects a pivot, partitions elements around it, and recurses." } },
    { match: (f) => f.hasInsertionShift && !f.hasNestedLoops, info: { name: "Insertion Sort", category: "Sorting", timeComplexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, spaceComplexity: "O(1)", description: "Builds sorted array by inserting elements into their correct position." } },
    { match: (f) => f.hasMinTracker && f.hasNestedLoops, info: { name: "Selection Sort", category: "Sorting", timeComplexity: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" }, spaceComplexity: "O(1)", description: "Finds the minimum element and places it at the beginning repeatedly." } },
    { match: (f) => f.hasCompareAndSwap && f.hasNestedLoops && f.maxLoopDepth >= 2, info: { name: "Bubble Sort", category: "Sorting", timeComplexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)" }, spaceComplexity: "O(1)", description: "Repeatedly steps through the list, compares adjacent elements, and swaps them." } },
    { match: (f) => f.hasDivideAndConquer && f.hasMidCalc, info: { name: "Binary Search", category: "Searching", timeComplexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, spaceComplexity: "O(1)", description: "Divides search interval in half." } },
    { match: (f) => f.hasMidCalc && !f.hasRecursion, info: { name: "Binary Search (Iterative)", category: "Searching", timeComplexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, spaceComplexity: "O(1)", description: "Iterative binary search dividing search space in half." } },
    { match: (f) => !f.hasNestedLoops && f.loopCount === 1 && !f.hasRecursion, info: { name: "Linear Scan", category: "Searching", timeComplexity: { best: "O(1)", average: "O(n)", worst: "O(n)" }, spaceComplexity: "O(1)", description: "Iterates sequentially." } },
];

/** detect from code using AST patterns (fallback) */
export function detectAlgorithm(code: string): AlgorithmInfo | null {
    try {
        const features = extractFeatures(code);
        for (const algo of ALGORITHMS) {
            if (algo.match(features)) return algo.info;
        }
        if (features.hasRecursion) {
            return { name: "Recursive Algorithm", category: "General", timeComplexity: { best: "—", average: "—", worst: "—" }, spaceComplexity: "O(n) stack", description: "Detected recursive function calls." };
        }
        if (features.maxLoopDepth >= 2) {
            return { name: "Nested Loop Algorithm", category: "General", timeComplexity: { best: `O(n^${features.maxLoopDepth})`, average: `O(n^${features.maxLoopDepth})`, worst: `O(n^${features.maxLoopDepth})` }, spaceComplexity: "O(1)", description: `Detected ${features.maxLoopDepth} nested loops.` };
        }
        if (features.loopCount >= 1) {
            return { name: "Iterative Algorithm", category: "General", timeComplexity: { best: "O(n)", average: "O(n)", worst: "O(n)" }, spaceComplexity: "O(1)", description: "Single-pass iteration." };
        }
        return null;
    } catch {
        return null;
    }
}
