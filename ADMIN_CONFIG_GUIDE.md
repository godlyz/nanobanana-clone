# 系统配置编写指南

## 🔥 配置键命名规则

配置键（config_key）按照以下格式命名：`类型前缀.具体名称.属性`

### 1. 积分消耗配置（credit.）
```
credit.text_to_image.cost      # 文生图积分消耗
credit.image_to_image.cost     # 图生图积分消耗
credit.upscale.cost            # 放大功能积分消耗
```

### 2. 试用配置（trial.）
```
trial.new_user                 # 新用户试用配置
```

### 3. 订阅配置（subscription.）
```
subscription.basic.monthly     # Basic套餐月付
subscription.basic.yearly      # Basic套餐年付
subscription.pro.monthly       # Pro套餐月付
subscription.pro.yearly        # Pro套餐年付
subscription.max.monthly       # Max套餐月付
subscription.max.yearly        # Max套餐年付
```

### 4. 积分包配置（package.）
```
package.starter                # Starter积分包
package.popular                # Popular积分包
package.pro                    # Pro积分包
package.ultimate               # Ultimate积分包
```

### 5. 价格配置（pricing.）
```
pricing.display_order          # 定价展示顺序
```

---

## 📝 配置值格式（JSON）

配置值必须是 **有效的 JSON 格式**！艹，别tm写错了！

### 1. 积分消耗配置
```json
{
  "amount": 1,
  "unit": "credits",
  "description": "文生图每张消耗积分"
}
```

**示例：**
- **配置键**: `credit.text_to_image.cost`
- **配置类型**: `credit_cost`
- **配置值**:
  ```json
  {"amount": 1, "unit": "credits", "description": "文生图每张消耗积分"}
  ```
- **描述**: `AI文生图功能积分消耗配置（1积分/张图片）`

---

### 2. 试用配置
```json
{
  "credits": 50,
  "validity_days": 15,
  "description": "新用户注册试用配置"
}
```

**示例：**
- **配置键**: `trial.new_user`
- **配置类型**: `trial`
- **配置值**:
  ```json
  {"credits": 50, "validity_days": 15, "description": "新用户注册试用配置"}
  ```
- **描述**: `新用户试用配置 - 50积分（15天有效）`

---

### 3. 订阅配置（月付）
```json
{
  "tier": "basic",
  "billing_cycle": "monthly",
  "price": 9.99,
  "currency": "USD",
  "monthly_credits": 100,
  "validity_days": 30,
  "description": "Basic套餐月付：每月100积分（30天有效）"
}
```

**示例：**
- **配置键**: `subscription.basic.monthly`
- **配置类型**: `subscription`
- **配置值**:
  ```json
  {
    "tier": "basic",
    "billing_cycle": "monthly",
    "price": 9.99,
    "currency": "USD",
    "monthly_credits": 100,
    "validity_days": 30,
    "description": "Basic套餐月付：每月100积分（30天有效）"
  }
  ```
- **描述**: `Basic套餐月付 - $9.99/月，100积分（30天有效）`

---

### 4. 订阅配置（年付）
```json
{
  "tier": "basic",
  "billing_cycle": "yearly",
  "price": 99.99,
  "currency": "USD",
  "monthly_credits": 100,
  "monthly_validity_days": 30,
  "bonus_credits": 240,
  "bonus_validity_days": 365,
  "total_credits": 1440,
  "bonus_percentage": 20,
  "description": "Basic套餐年付：每月发放100积分（30天有效），一次性赠送240积分（365天有效）"
}
```

**字段说明：**
- `monthly_credits`: 每月发放的积分（30天有效，过期清零）
- `monthly_validity_days`: 每月积分有效期（30天）
- `bonus_credits`: 一次性赠送的积分（365天有效）
- `bonus_validity_days`: 赠送积分有效期（365天）
- `total_credits`: 全年总积分（月积分×12 + 赠送积分）
- `bonus_percentage`: 赠送比例（%）

**示例：**
- **配置键**: `subscription.basic.yearly`
- **配置类型**: `subscription`
- **配置值**:
  ```json
  {
    "tier": "basic",
    "billing_cycle": "yearly",
    "price": 99.99,
    "currency": "USD",
    "monthly_credits": 100,
    "monthly_validity_days": 30,
    "bonus_credits": 240,
    "bonus_validity_days": 365,
    "total_credits": 1440,
    "bonus_percentage": 20,
    "description": "Basic套餐年付：每月发放100积分（30天有效），一次性赠送240积分（365天有效）"
  }
  ```
- **描述**: `Basic套餐年付 - $99.99/年，1200积分+240赠送（20% bonus）`

---

### 5. 积分包配置
```json
{
  "name": "Starter",
  "price": 12.99,
  "currency": "USD",
  "credits": 100,
  "validity_days": 365,
  "bonus_percentage": 0,
  "description": "Starter积分包：100积分（365天有效）"
}
```

**示例：**
- **配置键**: `package.starter`
- **配置类型**: `package`
- **配置值**:
  ```json
  {
    "name": "Starter",
    "price": 12.99,
    "currency": "USD",
    "credits": 100,
    "validity_days": 365,
    "bonus_percentage": 0,
    "description": "Starter积分包：100积分（365天有效）"
  }
  ```
- **描述**: `Starter积分包 - $12.99，100积分（365天有效）`

---

### 6. 带赠送的积分包配置
```json
{
  "name": "Popular",
  "price": 34.99,
  "currency": "USD",
  "credits": 300,
  "bonus_credits": 45,
  "total_credits": 345,
  "validity_days": 365,
  "bonus_percentage": 15,
  "description": "Popular积分包：300积分+15%赠送（365天有效）"
}
```

**示例：**
- **配置键**: `package.popular`
- **配置类型**: `package`
- **配置值**:
  ```json
  {
    "name": "Popular",
    "price": 34.99,
    "currency": "USD",
    "credits": 300,
    "bonus_credits": 45,
    "total_credits": 345,
    "validity_days": 365,
    "bonus_percentage": 15,
    "description": "Popular积分包：300积分+15%赠送（365天有效）"
  }
  ```
- **描述**: `Popular积分包 - $34.99，300积分+15%赠送（365天有效）`

---

### 7. 显示顺序配置
```json
{
  "subscription": ["basic", "pro", "max"],
  "package": ["starter", "popular", "pro", "ultimate"]
}
```

**示例：**
- **配置键**: `pricing.display_order`
- **配置类型**: `pricing`
- **配置值**:
  ```json
  {
    "subscription": ["basic", "pro", "max"],
    "package": ["starter", "popular", "pro", "ultimate"]
  }
  ```
- **描述**: `定价页面套餐和积分包的显示顺序`

---

## ⚠️ 注意事项

1. **配置值必须是有效的JSON格式**：
   - 使用双引号（`"`），不能用单引号（`'`）
   - 数字不要加引号：`"amount": 1` ✅  `"amount": "1"` ❌
   - JSON验证工具：https://jsonlint.com/

2. **有效期规则**：
   - 月付订阅：`validity_days: 30`
   - 年付订阅月积分：`monthly_validity_days: 30`
   - 年付订阅赠送积分：`bonus_validity_days: 365`
   - 积分包：`validity_days: 365`

3. **配置键不能重复**：
   - 创建时系统会自动检查是否已存在
   - 如果已存在，会更新而不是创建新的

4. **配置类型会自动推断**：
   - 以 `credit.` 开头 → `credit_cost`
   - 以 `trial.` 开头 → `trial`
   - 以 `subscription.` 开头 → `subscription`
   - 以 `package.` 开头 → `package`
   - 以 `pricing.` 开头 → `pricing`

5. **修改配置后会自动刷新缓存**：
   - 不需要重启服务器
   - 立即生效

---

## 🎯 快速示例

### 创建新的积分消耗配置
- **配置键**: `credit.video_generation.cost`
- **配置类型**: `credit_cost`
- **配置值**:
  ```json
  {"amount": 5, "unit": "credits", "description": "视频生成每秒消耗积分"}
  ```
- **描述**: `AI视频生成功能积分消耗配置（5积分/秒）`

### 创建新的积分包
- **配置键**: `package.mega`
- **配置类型**: `package`
- **配置值**:
  ```json
  {
    "name": "Mega",
    "price": 199.99,
    "currency": "USD",
    "credits": 2000,
    "bonus_credits": 800,
    "total_credits": 2800,
    "validity_days": 365,
    "bonus_percentage": 40,
    "description": "Mega积分包：2000积分+40%赠送（365天有效）"
  }
  ```
- **描述**: `Mega积分包 - $199.99，2000积分+40%赠送（365天有效）`

---

艹，就这样！别tm瞎写了，按照规则来！有问题再问老王！
