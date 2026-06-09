# 数据清洗、聚合与指标说明

本目录由 `scripts/preprocess_data.py` 生成，用于承接课程设计中的“数据采集与预处理”“数据分析与业务挖掘”部分。脚本按照“数据读取 → 字段清洗 → 业务补齐 → 质量检查 → 指标聚合 → JSON 输出”的流程执行，并额外生成预处理报告，便于后续撰写项目说明文档。

## 1. 数据来源

当前项目使用以下本地数据作为原始/参考数据：

- `data/stations.json`：环卫站点名称、地址、负责人、日处理量、运行状态。
- `data/map_points.json`：站点经纬度、地图展示值和中文状态。
- `data/daily_collection.json`：近 10 日垃圾收集量和回收量趋势。
- `data/district.json`：早期区域日产量参考数据。
- `data/monthly_rate.json`：月度资源化利用率趋势。
- `data/waste_class.json`：垃圾四分类占比数据。
- `data/beihai_districts.geojson`：北海市区县边界数据。
- `data/guangxi_cities.geojson`：广西城市背景边界数据。

其中 `stations.json` 和 `map_points.json` 字段较少，预处理脚本会根据业务映射补齐站点 ID、区县、经纬度、运行时段、设备在线数、设计处理能力和分类结构。

## 2. 预处理流程

### 2.1 数据读取

`load_raw_sources()` 统一读取 `data/*.json` 原始/参考数据，形成后续清洗、补齐和聚合的输入集合。

### 2.2 字段清洗

`clean_station_records()` 对站点基础字段进行清洗：

- 统一站点 ID；
- 将带单位的日处理量字符串转为数值；
- 将中文/英文运行状态标准化；
- 合并站点基础信息和地图点位信息。

### 2.3 业务补齐

`enrich_station_records()` 结合课程设计演示需求补齐以下字段：

- 所属区县；
- 运行时段；
- 设备在线数和设备总数；
- 设计处理能力；
- 四分类垃圾量；
- 负荷率；
- 近 7 天站点趋势。

这些补齐字段用于支撑首页驾驶舱、评估中心、调度中心和站点详情页的完整展示。

### 2.4 质量检查

`validate_stations()` 对标准化后的站点数据执行质量检查，包括：

- 站点数量检查；
- 在线/离线数量统计；
- 重复 ID 检查；
- 缺失关键字段检查；
- 经纬度范围检查；
- 高负荷站点识别。

### 2.5 指标聚合与输出

脚本分别生成：

- `dashboard.json`：首页驾驶舱数据；
- `assessment.json`：评估中心数据；
- `dispatch.json`：调度中心数据；
- `preprocess_report.json`：结构化预处理报告；
- `preprocess_report.md`：可直接用于课程说明文档的文字版预处理报告。

## 3. 清洗规则

### 3.1 单位字段转数值

原始站点数据中日处理量可能写成：

```json
{ "daily": "120吨" }
```

预处理后统一转成数值字段：

```json
{ "daily_tons": 120 }
```

### 3.2 状态标准化

原始状态可能来自英文或中文：

- `online`
- `运行中`
- `维护中`
- `offline`

预处理后统一为：

- `online`：在线/运行中
- `offline`：离线/维护中/异常

### 3.3 站点 ID 标准化

为方便接口和详情页路由使用，脚本按站点名称生成稳定 ID，例如：

- `北部湾广场站` → `beibuwan-square`
- `银滩站` → `yintan`
- `合浦站` → `hepu`

详情页接口使用：

```text
/stations/<station_id>
/api/stations/<station_id>
```

### 3.4 区县和经纬度补齐

若原始站点缺少区县字段，优先从补充映射读取；其次从地址中识别：

- 海城区
- 银海区
- 铁山港区
- 合浦县

经纬度优先来自 `data/map_points.json`，缺失时使用站点补充映射。

### 3.5 异常值和缺失值处理

- 日处理量无法解析时置为 `0`，并在质量检查中保留排查空间；
- 状态无法识别时默认归为 `offline`，避免误判为正常运行；
- 经纬度缺失时使用业务补充映射；
- 关键字段缺失会进入 `preprocess_report.json` 的 `missing_fields`；
- 经纬度超出北海市展示边界会进入 `coordinate_anomalies`。

## 4. 聚合逻辑

### 4.1 首页 Dashboard 聚合

输出文件：`data/processed/dashboard.json`

主要聚合内容：

- 今日垃圾收集量
- 昨日收集量和环比变化
- 资源化利用率
- 站点在线数量和离线数量
- 投诉总量和变化
- 各区日产量
- 近 10 日收集与回收趋势
- 月度资源化利用率趋势
- 重点站点负荷排行
- 环境监测、设备监测、运输效率、容量预警
- AI 预警和 AI 调度建议展示数据

### 4.2 评估中心聚合

输出文件：`data/processed/assessment.json`

主要聚合内容：

- 站点综合评分排序
- 各站点处理能力对比
- 站点评估热力矩阵
- 区域-站点树图
- 重点站点地图点位

### 4.3 调度中心聚合

输出文件：`data/processed/dispatch.json`

主要聚合内容：

- AI 预警数量
- 紧急事项数量
- 待执行调度建议数量
- 峰值时段和峰值负荷
- 调度地图点位
- 调度连线和分流量

## 5. 指标公式

### 今日收集量

```text
今日收集量 = Σ 各站点日处理量
```

### 收集量环比变化

```text
收集量变化 = 今日收集量 - 昨日收集量
收集量变化率 = 收集量变化 / 昨日收集量 × 100%
```

### 资源化利用率

```text
资源化利用率 = 当日回收量 / 当日收集量 × 100%
```

### 站点在线率

```text
站点在线率 = 在线站点数 / 站点总数 × 100%
```

### 设备在线率

```text
设备在线率 = 在线设备数 / 设备总数 × 100%
```

### 负荷率

```text
负荷率 = 日处理量 / 设计处理能力 × 100%
```

### 站点综合评分

```text
站点综合评分 = 处理能力得分 × 0.35
             + 资源化率得分 × 0.30
             + 设备在线率得分 × 0.20
             + 运行状态得分 × 0.15
```

其中：

```text
处理能力得分 = 当前站点设计处理能力 / 全市最大设计处理能力 × 100
资源化率得分 = 当前站点可回收物量 / 全市最大可回收物量 × 100
设备在线率得分 = 在线设备数 / 设备总数 × 100
运行状态得分 = 在线为 100，离线为 45
```

## 6. 预处理报告说明

执行脚本后会生成：

- `preprocess_report.json`：结构化数据处理报告，可用于程序读取或二次分析；
- `preprocess_report.md`：文字版报告，可直接复制到课程设计说明文档。

报告内容包括：

- 输入数据概况；
- 清洗与补齐统计；
- 数据质量检查结果；
- 聚合指标摘要；
- 输出文件清单。

## 7. 输出说明

执行：

```bash
D:/anaconda3/envs/env/python.exe scripts/preprocess_data.py
```

会生成：

- `data/processed/dashboard.json`
- `data/processed/assessment.json`
- `data/processed/dispatch.json`
- `data/processed/preprocess_report.json`
- `data/processed/preprocess_report.md`

Flask 后端默认从这些 processed 文件读取数据，再通过 `/api/dashboard`、`/api/assessment`、`/api/dispatch` 输出给前端页面。
