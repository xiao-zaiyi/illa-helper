/**
 * 网站管理工具函数
 * 提供URL模式生成和域名提取功能
 */

/**
 * 从URL中提取域名
 * @param url 完整的URL
 * @returns 提取的域名，如果解析失败则返回原URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.warn('URL解析失败，使用原URL:', url, error);
    // 降级处理：尝试从字符串中提取域名
    const match = url.match(/(?:https?:\ /\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  }
}

/**
 * 生成域名模式（通配符模式）
 * @param domain 域名
 * @returns 域名模式，格式为 *://example.com/*
 */
export function generateDomainPattern(domain: string): string {
  // 移除可能的www前缀
  const cleanDomain = domain.replace(/^www\./, '');
  return `*://${cleanDomain}/*`;
}

/**
 * 生成精确URL模式
 * @param url 完整URL
 * @returns 精确URL模式
 */
export function generateExactPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    // 移除可能的查询参数和片段，保留路径，并添加通配符以匹配该路径下的所有内容
    const basePath = urlObj.pathname.endsWith('/')
      ? urlObj.pathname
      : `${urlObj.pathname}*`;
    return `${urlObj.protocol}//${urlObj.host}${basePath}`;
  } catch (error) {
    console.warn('URL解析失败，使用原URL:', url, error);
    return url;
  }
}

/**
 * 生成友好的规则描述
 * @param pattern URL模式
 * @param type 规则类型
 * @returns 描述字符串
 */
export function generateRuleDescription(
  pattern: string,
  type: 'blacklist' | 'whitelist',
): string {
  const typeText = type === 'blacklist' ? '黑名单' : '白名单';

  if (pattern.includes('*://') && pattern.endsWith('/*')) {
    // 域名模式 *://example.com/*
    const domain = pattern.replace(/^\*:\/\//, '').replace(/\/\*$/, '');
    return `${typeText} - 域名: ${domain}`;
  } else {
    return `${typeText} - 页面: ${pattern}`;
  }
}

/**
 * 判断URL是否为特殊协议或本地地址
 * @param url URL字符串
 * @returns 是否为特殊地址
 */
export function isSpecialUrl(url: string): boolean {
  const specialProtocols = [
    'chrome:',
    'chrome-extension:',
    'moz-extension:',
    'edge:',
    'about:',
  ];
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const hasSpecialProtocol = specialProtocols.some((protocol) =>
    url.startsWith(protocol),
  );

  return isLocalhost || hasSpecialProtocol;
}

/**
 * 验证URL是否可以添加到规则中
 * @param url URL字符串
 * @returns 验证结果和错误信息
 */
export function validateUrlForRule(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL不能为空' };
  }

  if (isSpecialUrl(url)) {
    return { valid: false, error: '无法为浏览器内部页面或本地地址创建规则' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch (_) {
    return { valid: false, error: 'URL格式无效' };
  }
}
