interface Env {
  [key: string]: any
}

interface Config {
  [key: string]: any;
  seed: string;
  px2rem?: boolean;
  localserver: {
    root: string;
    [key: string]: any;
  }
  dest: string;
  plugins: string[];
  alias: {
    [key: string]: string
  };
  commit: {
    hostname: string;
    revAddr: string;
    [key: string]: any;
  }
}

interface Res {
  on(eventName: string, fn: () => void): this;
  trigger(eventName: string, args: any[]): this;
}

interface SelfOpzer {
  watch(env: Env, done: () => void): Res;
  all(env: Env): Res;
  getConfigSync(): Config;
  response: Res;
}

interface Opzer {
  (config: Config, root: string): SelfOpzer;
  handles: string[];
}

interface Cmd {
  name: string,
  version: string,
  path: string,
  optimize: Opzer,
  seed: {
    default: string[],
    yy: string[]
  }
}
declare const cmd: Cmd;
export=cmd;
