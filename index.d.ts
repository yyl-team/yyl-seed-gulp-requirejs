import { YylConfig, Env } from 'yyl-config-types'

/** 事件通知、触发句柄 */
interface Res {
  /** 事件绑定 */
  on(eventName: string, fn: () => void): this;
  /** 事件触发 */
  trigger(eventName: string, args: any[]): this;
}

interface Opzer {
  /** watch */
  watch(env: Env, done: () => void): Res;
  /** 打包 */
  all(env: Env): Res;
  /** 获取 runtime config */
  getConfigSync(): YylConfig;
  /** 事件具备 */
  response: Res;
  /** 事件绑定 */
  on(eventName: string, fn: () => void): this;
}

interface OptimizeOption {
  /** yyl.config */
  config: YylConfig 
  /** 项目根目录 */
  root: string
  /** watch|all */
  ctx?: string
  /** cli 参数 */
  iEnv?: Env
}

/** 构建相关具备 */
interface Optimize {
  (option: OptimizeOption): Promise<Opzer>;
  /** 允许执行的方法 */
  handles: string[];
}

interface Cmd {
  /** seed 包名称 */
  name: string,
  /** 版本 */
  version: string,
  /** 所在目录 */
  path: string,
  /** 打包相关方法 */
  optimize: Optimize,
  /** init-me 用参数 */
  seed: {
    default: string[],
    yy: string[]
  }
}
declare const cmd: Cmd;
export=cmd;
