export interface WebsiteRule {
  id: string;
  pattern: string;
  type: 'blacklist' | 'whitelist';
  enabled: boolean;
  createdAt: Date;
  description?: string;
}

export interface WebsiteManagementSettings {
  rules: WebsiteRule[];
}

export type WebsiteStatus = 'blacklisted' | 'whitelisted' | 'normal';

export interface RuleTypeOption {
  value: 'blacklist' | 'whitelist';
  label: string;
  description: string;
  icon: string;
  color: string;
}
