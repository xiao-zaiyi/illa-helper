import {
    UserSettings,
    ReplacementConfig,
    TranslationStyle
} from '@/src/modules/shared/types';
import { StorageService } from '@/src/modules/core/storage';
import { StyleManager } from '@/src/modules/styles';
import { TextReplacerService } from '@/src/modules/core/translation/TextReplacerService';
import { IConfigurationService } from '../types';

/**
 * 配置管理服务 - 负责处理用户设置和API配置
 */
export class ConfigurationService implements IConfigurationService {
    private storageService: StorageService;

    constructor() {
        this.storageService = StorageService.getInstance();
    }

    /**
     * 获取用户设置
     */
    async getUserSettings(): Promise<UserSettings> {
        return await this.storageService.getUserSettings();
    }

    /**
     * 创建替换配置对象
     */
    createReplacementConfig(settings: UserSettings): ReplacementConfig {
        // 获取当前活跃的API配置
        const activeConfig = settings.apiConfigs.find(
            (config) => config.id === settings.activeApiConfigId,
        );

        return {
            userLevel: settings.userLevel,
            replacementRate: settings.replacementRate,
            useGptApi: settings.useGptApi,
            apiConfig: activeConfig?.config || {
                apiKey: '',
                apiEndpoint: '',
                model: '',
                temperature: 0,
                enable_thinking: false,
                phraseEnabled: true,
            },
            inlineTranslation: true,
            translationStyle: settings.translationStyle,
            translationDirection: settings.translationDirection,
        };
    }

    /**
     * 根据最新设置更新所有相关模块的配置
     */
    updateConfiguration(
        settings: UserSettings,
        styleManager: StyleManager,
        textReplacer: TextReplacerService,
    ): void {
        styleManager.setTranslationStyle(settings.translationStyle);

        // 如果是自定义样式，应用自定义CSS
        if (settings.translationStyle === TranslationStyle.CUSTOM) {
            styleManager.setCustomCSS(settings.customTranslationCSS);
        }

        textReplacer.updateConfig(this.createReplacementConfig(settings));
    }

    /**
     * 获取活跃的API配置
     */
    getActiveApiConfig(settings: UserSettings) {
        return settings.apiConfigs.find(
            (config) => config.id === settings.activeApiConfigId,
        );
    }
}
