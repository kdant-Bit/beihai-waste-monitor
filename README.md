# 北海市环卫监测与调度可视化大屏

这是一个基于 `Flask + HTML/CSS/JS + ECharts + Leaflet` 的城市环卫可视化项目，包含：

- 首页驾驶舱
- 评估中心
- 调度中心
- 站点详情页

项目当前默认读取 `data/processed/*.json` 中的处理后数据运行；这些数据由 `scripts/preprocess_data.py` 从 `data/*.json` 原始/参考数据清洗、补齐和聚合生成。同时项目仍然预留了“接入真实数据”的后端适配层，后续可以无缝切换为：

- 本地 JSON 覆盖数据
- 第三方 HTTP 实时接口

---

## 启动方式

### 使用本机 Conda 环境

当前项目路径为 `E:\Claude\kdant`，可直接使用指定环境运行：

```powershell
cd E:\Claude\kdant
D:\anaconda3\envs\env\python.exe -m pip install -r requirements.txt
D:\anaconda3\envs\env\python.exe scripts\preprocess_data.py
D:\anaconda3\envs\env\python.exe app.py
```

其中 `scripts\preprocess_data.py` 用于生成：

- `data/processed/dashboard.json`
- `data/processed/assessment.json`
- `data/processed/dispatch.json`
- `data/processed/preprocess_report.json`
- `data/processed/preprocess_report.md`

`preprocess_report.md` 是文字版预处理报告，可用于后续项目说明文档中的“数据获取及分析/数据预处理过程”章节。

首次运行或修改 `data/*.json` 后，建议先执行一次预处理脚本。

### 使用普通 Python/虚拟环境

也可以在项目目录创建独立虚拟环境：

```powershell
cd 项目源码目录
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts\preprocess_data.py
python app.py
```

启动后访问：

```text
http://127.0.0.1:5000/
```

---

## 页面入口

- 首页：`/`
- 评估中心：`/assessment`
- 调度中心：`/dispatch`
- 站点详情：`/stations/<station_id>`

---

## 现有接口

### 业务接口

- `GET /api/dashboard`
- `GET /api/assessment`
- `GET /api/dispatch`
- `GET /api/stations/<station_id>`
- `GET /api/beihai-districts`
- `GET /api/guangxi-cities`

### 数据接入预留接口

- `GET /api/integration/status`
- `GET /api/integration/proxy?path=/xxx`
- `POST /api/integration/overrides/<payload_name>`
- `DELETE /api/integration/overrides/<payload_name>`

其中：

- `<payload_name>` 只支持：
  - `dashboard`
  - `assessment`
  - `dispatch`

---

## 已预留的真实数据接入方式

项目中已经新增了可切换的数据提供层，位置在：

- `app.py`

当前支持三种模式：

### 1. `static` 模式

默认模式，读取 `data/processed/*.json` 中的处理后数据。处理后数据由 `scripts/preprocess_data.py` 从 `data/*.json` 原始/参考数据清洗、补齐、聚合生成。

适合：

- 本地演示
- 前端联调
- 页面开发

### 2. 本地覆盖模式

如果目录存在：

```text
data/live/
```

系统会优先读取以下覆盖文件，并与默认静态数据自动合并：

- `data/live/dashboard.json`
- `data/live/assessment.json`
- `data/live/dispatch.json`

适合：

- 临时替换部分数据
- 联调某一个页面
- 不接真实接口时先验证数据结构

### 3. HTTP 实时接口模式

当环境变量：

```text
LIVE_DATA_PROVIDER=http
```

时，系统会将以下业务数据改为从真实接口读取：

- 首页数据
- 评估中心数据
- 调度中心数据
- 单站点详情数据

如果真实接口失败，系统会自动回退到静态数据/本地覆盖数据，不会导致整个页面直接崩溃。

---

## 如何接入真实 HTTP 数据

### 第一步：配置环境变量

可以参考项目中的：

- `.env.example`

建议至少配置以下内容：

```text
LIVE_DATA_PROVIDER=http
LIVE_DATA_BASE_URL=https://your-real-api.example.com
LIVE_DATA_API_TOKEN=your-token
LIVE_DATA_DASHBOARD_PATH=/dashboard
LIVE_DATA_ASSESSMENT_PATH=/assessment
LIVE_DATA_DISPATCH_PATH=/dispatch
LIVE_DATA_STATION_PATH_TEMPLATE=/stations/{station_id}
LIVE_DATA_TIMEOUT_SECONDS=10
```

### 第二步：确保真实接口返回 JSON

项目默认按以下路径拼接真实接口：

- `GET {LIVE_DATA_BASE_URL}{LIVE_DATA_DASHBOARD_PATH}`
- `GET {LIVE_DATA_BASE_URL}{LIVE_DATA_ASSESSMENT_PATH}`
- `GET {LIVE_DATA_BASE_URL}{LIVE_DATA_DISPATCH_PATH}`
- `GET {LIVE_DATA_BASE_URL}{LIVE_DATA_STATION_PATH_TEMPLATE}`

例如：

```text
GET https://your-real-api.example.com/dashboard
GET https://your-real-api.example.com/assessment
GET https://your-real-api.example.com/dispatch
GET https://your-real-api.example.com/stations/beibuwan-square
```

### 第三步：让真实接口返回与前端一致的数据结构

最重要的一点是：

**真实接口返回的数据字段，需要尽量与当前前端消费结构一致。**

推荐直接以当前这几个接口的返回结构为模板：

- `GET /api/dashboard`
- `GET /api/assessment`
- `GET /api/dispatch`
- `GET /api/stations/<station_id>`

如果你们后端已有真实字段，但结构不一致，建议在本项目后端适配层中做一次转换，再输出给前端。

---

## 如何快速验证真实接口是否接通

### 1. 查看当前接入状态

```text
GET /api/integration/status
```

返回示例：

```json
{
  "provider": "HttpProxyDataProvider",
  "mode": "http",
  "live_data_base_url": "https://your-real-api.example.com",
  "file_override_dir": "D:\\codex-code\\beihai-waste-monitor\\data\\live",
  "file_override_exists": true
}
```

### 2. 代理调试某个真实接口

```text
GET /api/integration/proxy?path=/dashboard
```

这个接口适合调试：

- 目标接口是否可访问
- token 是否生效
- 返回是否为 JSON
- 返回字段是否符合预期

---

## 如何不用改代码，直接注入测试数据

### 方法一：直接写本地覆盖文件

例如写入：

```text
data/live/dashboard.json
```

只覆盖你关心的字段即可，系统会自动和默认数据合并。

### 方法二：调用预留写入接口

写入首页覆盖数据：

```http
POST /api/integration/overrides/dashboard
Content-Type: application/json
```

请求体示例：

```json
{
  "metrics": {
    "daily_collect": 1560,
    "online_stations": 11
  }
}
```

删除覆盖数据：

```http
DELETE /api/integration/overrides/dashboard
```

支持的目标：

- `dashboard`
- `assessment`
- `dispatch`

---

## 推荐的真实数据接入策略

如果你准备正式接入生产数据，建议按这个顺序：

### 方案 A：先本地覆盖，后真实接口

1. 先通过 `data/live/*.json` 模拟真实结构
2. 确认前端展示无问题
3. 再切换到 `LIVE_DATA_PROVIDER=http`

适合：

- 前后端分阶段联调
- 第三方接口尚未完全就绪

### 方案 B：后端统一做字段适配

如果真实接口字段和本项目前端结构差异很大，建议：

1. 在真实平台接口层保持原格式
2. 在本项目 `HttpProxyDataProvider` 中做字段转换
3. 对前端继续输出现有结构

这样能避免：

- 前端大面积改动
- 多页面图表同步返工

---

## 你们后续真正要改哪里

如果未来正式接入真实平台，通常只需要重点改这几个位置：

- `app.py` 中的 `HttpProxyDataProvider`
- 真实接口字段到前端字段的映射逻辑
- `.env` / 环境变量配置

前端页面本身通常不需要大改。

---

## 建议的下一步

如果你已经有真实接口文档，我建议下一步直接做这件事：

1. 把真实接口文档给我
2. 我帮你把 `HttpProxyDataProvider` 改成实际字段映射版本
3. 再补一版联调用的字段对照表

这样你们就能从“预留接口”直接进入“真实联调”阶段。
