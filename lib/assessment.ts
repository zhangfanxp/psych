import { getQuestionConfig } from "./config";

export type ResultLevel = {
  code: string;
  name: string;
  min: number;
  max: number;
  studentMessage: string;
  adminAdvice: string;
};

export function getResultLevel(score: number): ResultLevel {
  const config = getQuestionConfig();
  const level = config.scoreRule.levels.find((item) => score >= item.min && score <= item.max);
  return level || config.scoreRule.levels[config.scoreRule.levels.length - 1];
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function optionLabel(value: "yes" | "no") {
  return value === "yes" ? "是" : "否";
}
