/**
 * 音标提供者工厂。
 *
 * 这里只创建真正返回音标的 provider。AI 释义由 translation 模块负责，
 * 不再伪装成 IPhoneticProvider。
 */

import { IPhoneticProvider } from './IPhoneticProvider';
import { DictionaryApiProvider } from './DictionaryApiProvider';

export class PhoneticProviderFactory {
  private static defaultProvider: IPhoneticProvider | null = null;

  static createProvider(): IPhoneticProvider {
    if (!this.defaultProvider) {
      this.defaultProvider = new DictionaryApiProvider();
    }

    return this.defaultProvider;
  }

  static getDefaultProvider(): IPhoneticProvider {
    return this.createProvider();
  }

  static clearInstances(): void {
    this.defaultProvider = null;
  }
}
