import fs from "fs";
import path from "path";

export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  timezone: string;
};

export type QuestionConfig = {
  testCode: string;
  testName: string;
  description: string;
  totalQuestions: number;
  scoreRule: {
    yes: number;
    no: number;
    levels: Array<{
      code: string;
      name: string;
      min: number;
      max: number;
      studentMessage: string;
      adminAdvice: string;
    }>;
  };
  questions: Array<{ number: number; text: string }>;
};

function readJson<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), "config", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function getDatabaseConfig() {
  return readJson<DatabaseConfig>("database.json");
}

export function getQuestionConfig() {
  return readJson<QuestionConfig>("questions.json");
}
