# 数据清洗、聚合与指标说明

本目录由 `scripts/preprocess_data.py` 生成，用于承接课程设计中的“数据采集与预处理”“数据分析与业务挖掘”部分。

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

## 2. 清洗规则

### 2.1 单位字段转数值

原始站点数据中日处理量可能写成：

```json
{ "daily": "120吨" }
```

预处理后统一转成数值字段：

```json
{ "daily_tons": 120 }
```

### 2.2 状态标准化

原始状态可能来自英文或中文：

- `online`
- `运行中`
- `维护中`
- `offline`

预处理后统一为：

- `online`：在线/运行中
- `offline`：离线/维护中/异常

### 2.3 站点 ID 标准化

为方便接口和详情页路由使用，脚本按站点名称生成稳定 ID，例如：

- `北部湾广场站` → `beibuwan-square`
- `银滩站` → `yintan`
- `合浦站` → `hepu`

详情页接口使用：

```text
/stations/<station_id>
/api/stations/<station_id>
```

### 2.4 区县和经纬度补齐

若原始站点缺少区县字段，优先从补充映射读取；其次从地址中识别：

- 海城区
- 银海区
- 铁山港区
- 合浦县

经纬度优先来自 `data/map_points.json`，缺失时使用站点补充映射。

### 2.5 业务字段补齐

为支撑可视化页面，预处理脚本为每个站点补齐：

- `operation_hours`：运行时段
- `equipment_online`：在线设备数
- `equipment_total`：设备总数
- `capacity`：设计处理能力
- `load_pct`：负荷率
- `classification`：四类垃圾量
- `weekly_trend`：近 7 天趋势

## 3. 聚合逻辑

### 3.1 首页 Dashboard 聚合

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

### 3.2 评估中心聚合

输出文件：`data/processed/assessment.json`

主要聚合内容：

- 站点综合评分排序
- 各站点处理能力对比
- 站点评估热力矩阵
- 区域-站点树图
- 重点站点地图点位

### 3.3 调度中心聚合

输出文件：`data/processed/dispatch.json`

主要聚合内容：

- AI 预警数量
- 紧急事项数量
- 待执行调度建议数量
- 峰值时段和峰值负荷
- 调度地图点位
- 调度连线和分流量

## 4. 指标公式

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

## 5. 输出说明

执行：

```bash
D:/anaconda3/envs/env/python.exe scripts/preprocess_data.py
```

会生成：

- `data/processed/dashboard.json`
- `data/processed/assessment.json`
- `data/processed/dispatch.json`

Flask 后端默认从这些 processed 文件读取数据，再通过 `/api/dashboard`、`/api/assessment`、`/api/dispatch` 输出给前端页面。
