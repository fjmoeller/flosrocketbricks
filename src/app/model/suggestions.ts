export interface SuggestionView {
  id: number;
  content: string;
  comments: string;
  time: number;
  upvotes:number;
  state: SuggestionState;
}

export enum SuggestionState {
  OPEN,
  DONE,
  REJECTED,
}

export interface SuggestionCreate {
  password: string; //8 Zeichen [A-z0-9]
  content: string;
}
