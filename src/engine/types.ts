export interface VariableState {
    name: string;
    value: unknown;
    type: string;
    changed: boolean;
}

export interface ArrayState {
    name: string;
    values: number[];
    highlights: number[]; // indices being compared
    swapped: number[]; // indices just swapped
    sorted: number[]; // indices confirmed sorted
}

export interface ObjectState {
    name: string;
    entries: { key: string; value: unknown; changed: boolean }[];
}

export interface Snapshot {
    step: number;
    line: number;
    variables: VariableState[];
    arrays: ArrayState[];
    objects: ObjectState[];
    callStack: string[];
    logs: string[];
    comparisons: number;
    swaps: number;
    description: string;
}

export interface AlgorithmInfo {
    name: string;
    category: string;
    timeComplexity: { best: string; average: string; worst: string };
    spaceComplexity: string;
    description: string;
}
