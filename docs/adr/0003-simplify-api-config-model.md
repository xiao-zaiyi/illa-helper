# Simplify API Config Model

API 配置存储模型只保留当前运行所需的最小字段，不再保存品牌名 provider、`isDefault`、`createdAt`、`updatedAt` 这类历史元数据。用户界面的 OpenAI、DeepSeek、SiliconFlow 只是创建配置时的预设，运行时和存储层只认协议族；删除规则也改为“至少保留一个配置”，而不是依赖默认配置这种特殊标记。API 请求统一走扩展 background，`useBackgroundProxy` 不再作为用户配置项或运行时分支存在。
