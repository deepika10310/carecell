export type HelloResponse = {
  message: string;
};

export type GreetingState =
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error" };