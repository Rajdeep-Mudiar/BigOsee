import { create } from "zustand";
import type { AlgorithmInfo } from "@/engine/types";

interface CodeState {
  code: string;
  language: string;
  detectedAlgorithm: AlgorithmInfo | null;
  activeQuestionId: string | null;

  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setDetectedAlgorithm: (info: AlgorithmInfo | null) => void;
  setActiveQuestion: (id: string, code: string) => void;
}

const DEFAULT_CODE = `// paste or write your algorithm here
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}`;

export const useCodeStore = create<CodeState>((set) => ({
  code: DEFAULT_CODE,
  language: "javascript",
  detectedAlgorithm: null,
  activeQuestionId: null,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setDetectedAlgorithm: (info) => set({ detectedAlgorithm: info }),
  setActiveQuestion: (id, code) => set({ activeQuestionId: id, code }),
}));
