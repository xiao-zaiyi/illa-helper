import { ServiceDispatcher } from '../ServiceDispatcher';
import { failoverExecutor } from '../FailoverExecutor';
import { ApiConfigItem } from '../../../shared/types/api';

export class LoadBalancerTestSuite {
  private dispatcher: ServiceDispatcher;
  private logs: string[] = [];
  private passed = 0;
  private failed = 0;

  constructor() {
    this.dispatcher = ServiceDispatcher.getInstance();
  }

  private log(message: string, type: 'info' | 'pass' | 'fail' = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const prefix = type === 'pass' ? '✅ ' : type === 'fail' ? '❌ ' : 'ℹ️ ';
    this.logs.push(`[${timestamp}] ${prefix}${message}`);
    if (type === 'pass') this.passed++;
    if (type === 'fail') this.failed++;
  }

  private assert(condition: boolean, message: string) {
    if (condition) {
      this.log(message, 'pass');
    } else {
      this.log(message, 'fail');
    }
  }

  private createMockConfigs(count: number): ApiConfigItem[] {
    return Array.from({ length: count }).map((_, i) => ({
      id: `mock-${i + 1}`,
      name: `Mock Config ${i + 1}`,
      provider: 'mock',
      enabled: true,
      config: {} as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      weight: 100,
      priority: 1,
    }));
  }

  async run(): Promise<{ passed: number; failed: number; logs: string[] }> {
    this.logs = [];
    this.passed = 0;
    this.failed = 0;

    this.log('开始执行负载均衡单元测试...');

    try {
      await this.testRoundRobin();
      await this.testCooldownLogic();
      await this.testFailoverQueue();
      await this.testFailoverExecution();
    } catch (e: any) {
      this.log(`测试过程中发生异常: ${e.message}`, 'fail');
    }

    this.log('----------------------------------------');
    this.log(`测试完成：通过 ${this.passed}, 失败 ${this.failed}`);
    return { passed: this.passed, failed: this.failed, logs: this.logs };
  }

  // 测试 1: 轮询逻辑
  private async testRoundRobin() {
    this.log('----------------------------------------');
    this.log('>>> 测试场景 1: 基础轮询逻辑 (Round-Robin)');

    // 重置状态
    this.dispatcher.resetIndex();
    this.dispatcher.clearRuntimeStatusCache();

    const configs = this.createMockConfigs(3); // C1, C2, C3

    // 第一次获取 -> C1
    const r1 = this.dispatcher.getNextConfig(configs);
    this.assert(
      r1?.id === 'mock-1',
      `第一次调用应返回 mock-1, 实际: ${r1?.id}`,
    );

    // 第二次获取 -> C2
    const r2 = this.dispatcher.getNextConfig(configs);
    this.assert(
      r2?.id === 'mock-2',
      `第二次调用应返回 mock-2, 实际: ${r2?.id}`,
    );

    // 第三次获取 -> C3
    const r3 = this.dispatcher.getNextConfig(configs);
    this.assert(
      r3?.id === 'mock-3',
      `第三次调用应返回 mock-3, 实际: ${r3?.id}`,
    );

    // 第四次获取 -> C1 (循环)
    const r4 = this.dispatcher.getNextConfig(configs);
    this.assert(
      r4?.id === 'mock-1',
      `第四次调用应回到 mock-1, 实际: ${r4?.id}`,
    );
  }

  // 测试 2: 冷却逻辑
  private async testCooldownLogic() {
    this.log('----------------------------------------');
    this.log('>>> 测试场景 2: 错误冷却机制 (Cooldown)');

    // 清除状态
    this.dispatcher.clearRuntimeStatusCache();

    // 标记 C1 出错，冷却 5秒
    this.dispatcher.markConfigError(
      'mock-1',
      { code: 429, message: 'Too Many Requests' },
      5000,
    );

    const stats = this.dispatcher.getConfigStats('mock-1');
    this.assert(stats !== null, '状态缓存应存在');
    this.assert(
      stats?.failureCount === 1,
      `失败次数应为 1, 实际: ${stats?.failureCount}`,
    );
    this.assert(stats?.isInCooldown === true, 'mock-1 应处于冷却状态');

    // 模拟成功清除冷却
    this.dispatcher.markConfigSuccess('mock-1');
    const statsAfterSuccess = this.dispatcher.getConfigStats('mock-1');
    this.assert(
      statsAfterSuccess?.isInCooldown === false,
      '成功调用后，mock-1 应不再处于冷却状态',
    );
  }

  // 测试 3: 故障转移队列构建
  private async testFailoverQueue() {
    this.log('----------------------------------------');
    this.log('>>> 测试场景 3: 故障转移队列构建 (Failover Queue)');
    this.dispatcher.resetIndex();

    const configs = this.createMockConfigs(3);

    // 当前 index 指向 0 (mock-1)
    // buildFailoverQueue 应该消耗一次 index，并返回 [mock-1, mock-2, mock-3]

    const queue1 = this.dispatcher.buildFailoverQueue(configs);
    this.assert(
      queue1[0].id === 'mock-1',
      `队列首位应为 mock-1, 实际: ${queue1[0]?.id}`,
    );
    this.assert(queue1.length === 3, `队列长度应为 3, 实际: ${queue1.length}`);
    this.assert(
      queue1.some((c) => c.id === 'mock-2'),
      '队列应包含 mock-2',
    );

    // 下一次调用，index 应该已经变了，首选应该是 mock-2
    const queue2 = this.dispatcher.buildFailoverQueue(configs);
    this.assert(
      queue2[0].id === 'mock-2',
      `第二次构建，队列首位应为 mock-2, 实际: ${queue2[0]?.id}`,
    );
  }

  // 测试 4: FailoverExecutor 逻辑
  private async testFailoverExecution() {
    this.log('----------------------------------------');
    this.log('>>> 测试场景 4: 故障转移执行 (FailoverExecutor)');

    // 模拟三个配置
    const configs = this.createMockConfigs(3);

    let attempts = 0;
    // 模拟任务：如果用 mock-1 则失败，其他成功
    const task = async (config: ApiConfigItem) => {
      attempts++;
      this.log(`Attempt ${attempts} with ${config.id}`, 'info');

      if (config.id === 'mock-1') {
        const err = new Error('Simulated 500 Error');
        // 模拟 fetch 错误对象结构，或者 ServiceDispatcher 处理的结构
        (err as any).status = 500;
        throw err;
      }
      return `Success with ${config.id}`;
    };

    try {
      // 重置状态
      this.dispatcher.resetIndex();
      this.dispatcher.clearRuntimeStatusCache();

      // 执行故障转移
      // initial: index=0 -> queue=[C1, C2, C3]
      // execute: try C1 -> fail -> mark C1 error -> try C2 -> success

      const result = await failoverExecutor.executeWithFailover(task, configs);

      this.assert(result.success === true, 'Failover 执行应成功');
      this.assert(
        result.data === 'Success with mock-2',
        `应最终在 mock-2 成功, 实际返回: ${result.data}`,
      );
      this.assert(attempts === 2, `应尝试 2 次后成功, 实际尝试: ${attempts}`);

      // 验证 mock-1 是否被标记为错误
      const stats = this.dispatcher.getConfigStats('mock-1');
      this.assert(stats?.failureCount === 1, 'mock-1 应被标记为失败一次');
    } catch (e: any) {
      this.assert(false, `Failover 测试抛出意外异常: ${e.message}`);
    }
  }
}
