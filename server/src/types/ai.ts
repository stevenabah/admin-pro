export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface NL2SQLRequest {
  question: string;
}

export interface NL2SQLResponse {
  sql: string;
  results: any[];
  columns: string[];
}
