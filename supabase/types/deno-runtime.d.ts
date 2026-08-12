interface NextbridgeDenoEnvironment {
  get(name: string): string | undefined;
}

declare const Deno: {
  env: NextbridgeDenoEnvironment;
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
