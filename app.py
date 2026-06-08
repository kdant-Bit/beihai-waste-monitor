from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from flask import Flask, abort, jsonify, render_template


BASE_DIR = Path(__file__).resolve().parent
BEIHAI_DISTRICTS_PATH = BASE_DIR / "data" / "beihai_districts.geojson"
GUANGXI_CITIES_PATH = BASE_DIR / "data" / "guangxi_cities.geojson"
app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)


def build_dashboard_payload() -> dict[str, Any]:
    stations = [
        {
            "id": "beibuwan-square",
            "name": "北部湾广场站",
            "address": "海城区北部湾中路",
            "collector": "李建国",
            "daily_tons": 135,
            "status": "online",
            "lat": 21.48,
            "lng": 109.12,
            "district": "海城区",
            "operation_hours": "06:00 - 22:00",
            "equipment_online": 8,
            "equipment_total": 8,
            "classification": [
                {"name": "厨余垃圾", "value": 54},
                {"name": "其他垃圾", "value": 39},
                {"name": "可回收物", "value": 33},
                {"name": "有害垃圾", "value": 9},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [126, 131, 129, 133, 137, 134, 135],
            },
        },
        {
            "id": "yintan",
            "name": "银滩站",
            "address": "银海区银滩大道",
            "collector": "张海明",
            "daily_tons": 120,
            "status": "online",
            "lat": 21.42,
            "lng": 109.15,
            "district": "银海区",
            "operation_hours": "07:00 - 22:00",
            "equipment_online": 6,
            "equipment_total": 7,
            "classification": [
                {"name": "厨余垃圾", "value": 46},
                {"name": "其他垃圾", "value": 35},
                {"name": "可回收物", "value": 30},
                {"name": "有害垃圾", "value": 9},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [112, 114, 118, 116, 121, 119, 120],
            },
        },
        {
            "id": "qiaogang",
            "name": "侨港站",
            "address": "银海区侨港镇",
            "collector": "王芳",
            "daily_tons": 110,
            "status": "online",
            "lat": 21.44,
            "lng": 109.11,
            "district": "银海区",
            "operation_hours": "06:30 - 21:30",
            "equipment_online": 5,
            "equipment_total": 6,
            "classification": [
                {"name": "厨余垃圾", "value": 42},
                {"name": "其他垃圾", "value": 33},
                {"name": "可回收物", "value": 27},
                {"name": "有害垃圾", "value": 8},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [102, 104, 106, 108, 111, 109, 110],
            },
        },
        {
            "id": "tieshangang",
            "name": "铁山港站",
            "address": "铁山港区兴港路",
            "collector": "陈志强",
            "daily_tons": 98,
            "status": "online",
            "lat": 21.50,
            "lng": 109.42,
            "district": "铁山港区",
            "operation_hours": "07:30 - 21:00",
            "equipment_online": 4,
            "equipment_total": 5,
            "classification": [
                {"name": "厨余垃圾", "value": 36},
                {"name": "其他垃圾", "value": 29},
                {"name": "可回收物", "value": 25},
                {"name": "有害垃圾", "value": 8},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [92, 94, 96, 93, 99, 97, 98],
            },
        },
        {
            "id": "hepu",
            "name": "合浦站",
            "address": "合浦县廉州大道",
            "collector": "赵永刚",
            "daily_tons": 72,
            "status": "offline",
            "lat": 21.66,
            "lng": 109.20,
            "district": "合浦县",
            "operation_hours": "08:00 - 20:00",
            "equipment_online": 3,
            "equipment_total": 5,
            "classification": [
                {"name": "厨余垃圾", "value": 26},
                {"name": "其他垃圾", "value": 21},
                {"name": "可回收物", "value": 18},
                {"name": "有害垃圾", "value": 7},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [70, 73, 72, 68, 0, 0, 72],
            },
        },
        {
            "id": "industrial-park",
            "name": "工业园区站",
            "address": "海城区北海大道东",
            "collector": "刘伟",
            "daily_tons": 150,
            "status": "online",
            "lat": 21.52,
            "lng": 109.17,
            "district": "海城区",
            "operation_hours": "24小时运行",
            "equipment_online": 10,
            "equipment_total": 10,
            "classification": [
                {"name": "厨余垃圾", "value": 58},
                {"name": "其他垃圾", "value": 44},
                {"name": "可回收物", "value": 37},
                {"name": "有害垃圾", "value": 11},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [142, 146, 149, 151, 153, 150, 150],
            },
        },
        {
            "id": "old-town-transfer",
            "name": "老城转运站",
            "address": "海城区四川南路",
            "collector": "周明辉",
            "daily_tons": 140,
            "status": "online",
            "lat": 21.47,
            "lng": 109.10,
            "district": "海城区",
            "operation_hours": "06:00 - 23:00",
            "equipment_online": 9,
            "equipment_total": 9,
            "classification": [
                {"name": "厨余垃圾", "value": 55},
                {"name": "其他垃圾", "value": 43},
                {"name": "可回收物", "value": 33},
                {"name": "有害垃圾", "value": 9},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [132, 136, 138, 141, 143, 139, 140],
            },
        },
        {
            "id": "yintan-east",
            "name": "银滩东区站",
            "address": "银海区金海岸大道",
            "collector": "梁晓云",
            "daily_tons": 124,
            "status": "online",
            "lat": 21.41,
            "lng": 109.20,
            "district": "银海区",
            "operation_hours": "07:00 - 22:30",
            "equipment_online": 7,
            "equipment_total": 7,
            "classification": [
                {"name": "厨余垃圾", "value": 48},
                {"name": "其他垃圾", "value": 37},
                {"name": "可回收物", "value": 30},
                {"name": "有害垃圾", "value": 9},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [118, 120, 123, 121, 126, 125, 124],
            },
        },
        {
            "id": "airport-logistics",
            "name": "机场物流园站",
            "address": "合浦县北海大道西延线",
            "collector": "冯建平",
            "daily_tons": 170,
            "status": "online",
            "lat": 21.54,
            "lng": 109.25,
            "district": "合浦县",
            "operation_hours": "24小时运行",
            "equipment_online": 11,
            "equipment_total": 12,
            "classification": [
                {"name": "厨余垃圾", "value": 61},
                {"name": "其他垃圾", "value": 58},
                {"name": "可回收物", "value": 40},
                {"name": "有害垃圾", "value": 11},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [162, 165, 168, 171, 173, 169, 170],
            },
        },
        {
            "id": "lianzhou-west",
            "name": "廉州西片区站",
            "address": "合浦县廉州镇西环路",
            "collector": "黄淑敏",
            "daily_tons": 167,
            "status": "online",
            "lat": 21.67,
            "lng": 109.16,
            "district": "合浦县",
            "operation_hours": "06:30 - 22:00",
            "equipment_online": 8,
            "equipment_total": 9,
            "classification": [
                {"name": "厨余垃圾", "value": 64},
                {"name": "其他垃圾", "value": 51},
                {"name": "可回收物", "value": 41},
                {"name": "有害垃圾", "value": 11},
            ],
            "weekly_trend": {
                "dates": ["5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "values": [158, 161, 164, 166, 169, 168, 167],
            },
        },
    ]

    return {
        "meta": {
            "city": "北海市",
            "title": "智慧环卫数据监测平台",
            "subtitle": "Beihai Smart Waste Management Dashboard",
        },
        "metrics": {
            "daily_collect": 1286,
            "daily_collect_yesterday": 1240,
            "daily_collect_change": 46,
            "daily_collect_pct": 3.7,
            "utilization_rate": 38,
            "utilization_rate_yesterday": 37,
            "utilization_rate_change": 1,
            "utilization_rate_target": 40,
            "online_stations": 9,
            "online_stations_total": 10,
            "online_stations_offline": 1,
        },
        "alerts": [
            {
                "level": "warning",
                "message": "合浦站处于离线状态超过 24 小时，影响合浦县区域覆盖，建议尽快安排维护人员排查。",
            },
        ],
        "analysis": {
            "conclusions": [
                {"level": "good", "text": "今日收集总量 1286 吨，较昨日 +46 吨（+3.7%），运行态势良好。"},
                {"level": "warn", "text": "资源化利用率 38%，距目标 40% 还差 2 个百分点，银海区可回收物分拣需加强。"},
                {"level": "bad", "text": "合浦站离线超 24h，合浦县 72 吨/日垃圾无在线监测数据，需立即排查。"},
                {"level": "info", "text": "工业园区站日处理 168 吨全市最高，建议评估增加转运频次与备用设备。"},
                {"level": "good", "text": "厨余垃圾占比 44%，分类质量较上月提升 3 个百分点，源头分类成效显著。"},
            ],
        },
        "charts": {
            "waste_class": {
                "title": "垃圾四分类占比",
                "data": [
                    {"name": "厨余垃圾", "value": 610},
                    {"name": "其他垃圾", "value": 420},
                    {"name": "可回收物", "value": 210},
                    {"name": "有害垃圾", "value": 46},
                ],
            },
            "district": {
                "title": "各区垃圾日产量（吨）",
                "categories": ["海城区", "银海区", "铁山港区", "合浦县"],
                "values": [425, 354, 98, 409],
            },
            "daily_trend": {
                "title": "近10日垃圾收集与回收趋势（吨）",
                "dates": ["5/20", "5/21", "5/22", "5/23", "5/24", "5/25", "5/26", "5/27", "5/28", "5/29"],
                "collection": [1180, 1205, 1176, 1224, 1239, 1268, 1247, 1259, 1274, 1286],
                "recycling": [432, 438, 425, 451, 463, 478, 470, 474, 481, 486],
            },
            "monthly_rate": {
                "title": "月度资源化利用率趋势（%），目标 40%",
                "months": ["1月", "2月", "3月", "4月", "5月"],
                "values": [31, 33, 35, 37, 38],
                "target": 40,
            },
            "district_efficiency": {
                "title": "各区资源化效率对比",
                "categories": ["海城区", "银海区", "铁山港区", "合浦县"],
                "recovery_rate": [42, 39, 34, 31],
                "daily_average": [425, 354, 98, 409],
            },
            "station_load": {
                "title": "重点站点负荷分析",
                "categories": ["机场物流园站", "廉州西片区站", "工业园区站", "老城转运站", "北部湾广场站", "银滩东区站"],
                "values": [170, 167, 150, 140, 135, 124],
            },
            "accuracy": {
                "title": "分类准确率统计",
                "data": [
                    {"name": "厨余", "value": 92, "color": "#4CAF50"},
                    {"name": "可回收", "value": 88, "color": "#2196F3"},
                    {"name": "有害", "value": 95, "color": "#F44336"},
                    {"name": "其他", "value": 85, "color": "#9E9E9E"},
                ],
            },
        },
        "environment": {
            "title": "环境监测分析",
            "air_quality": {"aqi": 72, "level": "良", "pm25": 38, "pm10": 62, "trend": "stable"},
            "emission": {
                "title": "垃圾处理排放监测",
                "categories": ["CO2", "CH4", "NOx", "SO2"],
                "values": [320, 85, 42, 18],
                "limits": [400, 120, 80, 50],
            },
            "leachate": {"daily_tons": 85, "treatment_rate": 96, "status": "normal"},
        },
        "complaints": {
            "title": "投诉分析",
            "total_month": 47,
            "total_change": -12,
            "categories": ["噪音扰民", "异味污染", "运输洒漏", "分类不规范", "其他"],
            "values": [18, 12, 8, 6, 3],
            "trend_dates": ["5/15", "5/18", "5/21", "5/24", "5/27", "5/29"],
            "trend_values": [11, 9, 8, 7, 6, 5],
        },
        "capacity_alerts": {
            "title": "容量预警",
            "alerts": [
                {"station": "工业园区站", "level": "high", "load_pct": 92, "message": "负荷达 92%，建议增加转运频次"},
                {"station": "老城转运站", "level": "medium", "load_pct": 78, "message": "负荷偏高，关注设备状态"},
                {"station": "银滩站", "level": "low", "load_pct": 62, "message": "运行正常"},
            ],
        },
        "equipment": {
            "title": "设备监测",
            "total": 58,
            "online": 51,
            "offline": 7,
            "categories": ["压缩机", "粉碎机", "分拣机", "除臭设备", "渗滤液处理"],
            "online_counts": [12, 8, 15, 10, 6],
            "total_counts": [14, 10, 16, 11, 7],
        },
        "transport": {
            "title": "运输效率",
            "avg_time_min": 42,
            "avg_time_yesterday": 45,
            "on_time_rate": 91,
            "on_time_yesterday": 88,
            "routes": ["海城线", "银海线", "铁山港线", "合浦线"],
            "efficiency": [94, 88, 85, 90],
        },
        "ai_alerts": {
            "title": "AI预警中心",
            "predictions": [
                {"level": "danger", "message": "合浦站预计明日垃圾增长 15%，建议提前增派运输车辆", "probability": 87},
                {"level": "warning", "message": "银海区未来 3 天有暴雨预测，渗滤液处理设备需检查", "probability": 72},
                {"level": "info", "message": "厨余垃圾占比持续上升，分类质量趋好", "probability": 65},
            ],
        },
        "ai_dispatch": {
            "title": "AI调度建议",
            "recommendations": [
                {"priority": 1, "action": "增派 2 辆运输车至工业园区站", "reason": "负荷超 90%，预计峰值时段 14:00-16:00", "eta": "30分钟内"},
                {"priority": 2, "action": "合浦站维修队即刻出发", "reason": "离线超 24h，影响合浦县全域", "eta": "已通知"},
                {"priority": 3, "action": "银滩站增加可回收物分拣班次", "reason": "可回收物占比低于市均 5pp", "eta": "明日执行"},
            ],
        },
        "ai_forecast": {
            "title": "未来 24 小时预测",
            "hours": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
            "collection_forecast": [28, 22, 85, 120, 105, 68, 35],
            "recycling_forecast": [10, 8, 32, 45, 40, 25, 13],
            "confidence_upper": [35, 28, 98, 138, 118, 78, 42],
            "confidence_lower": [21, 16, 72, 102, 92, 58, 28],
        },
        "stations": stations,
        "default_station_id": "beibuwan-square",
    }


def get_station_by_id(station_id: str) -> dict[str, Any] | None:
    payload = build_dashboard_payload()
    return next((item for item in payload["stations"] if item["id"] == station_id), None)


def build_assessment_payload() -> dict[str, Any]:
    rankings = [
        {"name": "机场物流园站", "recycling": 68, "output": 170, "capacity": 185, "score": 93},
        {"name": "廉州西片区站", "recycling": 64, "output": 167, "capacity": 178, "score": 91},
        {"name": "工业园区站", "recycling": 61, "output": 150, "capacity": 168, "score": 89},
        {"name": "老城转运站", "recycling": 58, "output": 140, "capacity": 155, "score": 87},
        {"name": "北部湾广场站", "recycling": 55, "output": 135, "capacity": 150, "score": 85},
        {"name": "银滩东区站", "recycling": 51, "output": 124, "capacity": 138, "score": 83},
        {"name": "银滩站", "recycling": 49, "output": 120, "capacity": 132, "score": 82},
        {"name": "侨港站", "recycling": 45, "output": 110, "capacity": 124, "score": 79},
        {"name": "铁山港站", "recycling": 39, "output": 98, "capacity": 118, "score": 75},
        {"name": "合浦站", "recycling": 27, "output": 72, "capacity": 110, "score": 58},
    ]

    return {
        "meta": {
            "title": "北海市垃圾回收与处理能力评估",
            "subtitle": "Beihai Station Assessment Center",
        },
        "summary": {
            "total_output": 1286,
            "total_recycling": 517,
            "average_capacity": 145,
            "top_station": "机场物流园站",
        },
        "rankings": rankings,
        "charts": {
            "vertical_bar": {
                "title": "各站点综合评分排序",
                "categories": [item["name"] for item in rankings],
                "values": [item["score"] for item in rankings],
            },
            "horizontal_bar": {
                "title": "各站点处理能力对比（吨/日）",
                "categories": [item["name"] for item in rankings],
                "values": [item["capacity"] for item in rankings],
            },
            "heatmap": {
                "title": "站点评估热力矩阵",
                "xAxis": ["回收量", "产出量", "处理能力", "综合评分"],
                "yAxis": [item["name"] for item in rankings],
                "values": [
                    [0, 0, 68], [1, 0, 170], [2, 0, 185], [3, 0, 93],
                    [0, 1, 64], [1, 1, 167], [2, 1, 178], [3, 1, 91],
                    [0, 2, 61], [1, 2, 150], [2, 2, 168], [3, 2, 89],
                    [0, 3, 58], [1, 3, 140], [2, 3, 155], [3, 3, 87],
                    [0, 4, 55], [1, 4, 135], [2, 4, 150], [3, 4, 85],
                    [0, 5, 51], [1, 5, 124], [2, 5, 138], [3, 5, 83],
                    [0, 6, 49], [1, 6, 120], [2, 6, 132], [3, 6, 82],
                    [0, 7, 45], [1, 7, 110], [2, 7, 124], [3, 7, 79],
                    [0, 8, 39], [1, 8, 98], [2, 8, 118], [3, 8, 75],
                    [0, 9, 27], [1, 9, 72], [2, 9, 110], [3, 9, 58],
                ],
            },
            "tree": {
                "title": "区域-站点处理能力树图",
                "data": {
                    "name": "北海市",
                    "children": [
                        {
                            "name": "海城区",
                            "children": [
                                {"name": "工业园区站", "value": 168},
                                {"name": "北部湾广场站", "value": 150},
                                {"name": "老城转运站", "value": 155},
                            ],
                        },
                        {
                            "name": "银海区",
                            "children": [
                                {"name": "银滩站", "value": 132},
                                {"name": "侨港站", "value": 124},
                                {"name": "银滩东区站", "value": 138},
                            ],
                        },
                        {
                            "name": "铁山港区",
                            "children": [
                                {"name": "铁山港站", "value": 118},
                            ],
                        },
                        {
                            "name": "合浦县",
                            "children": [
                                {"name": "机场物流园站", "value": 185},
                                {"name": "廉州西片区站", "value": 178},
                                {"name": "合浦站", "value": 110},
                            ],
                        },
                    ],
                },
            },
            "flows": {
                "title": "重点站点垃圾流向飞线",
                "center": {"name": "工业园区站", "coord": [109.17, 21.52]},
                "lines": [
                    {"from": "北部湾广场站", "coords": [[109.12, 21.48], [109.17, 21.52]], "value": 38},
                    {"from": "老城转运站", "coords": [[109.10, 21.47], [109.17, 21.52]], "value": 42},
                    {"from": "银滩站", "coords": [[109.15, 21.42], [109.17, 21.52]], "value": 31},
                    {"from": "机场物流园站", "coords": [[109.25, 21.54], [109.17, 21.52]], "value": 47},
                    {"from": "廉州西片区站", "coords": [[109.16, 21.67], [109.17, 21.52]], "value": 36},
                ],
                "points": [
                    {"name": "北部湾广场站", "coord": [109.12, 21.48], "value": 135},
                    {"name": "老城转运站", "coord": [109.10, 21.47], "value": 140},
                    {"name": "银滩站", "coord": [109.15, 21.42], "value": 120},
                    {"name": "机场物流园站", "coord": [109.25, 21.54], "value": 170},
                    {"name": "廉州西片区站", "coord": [109.16, 21.67], "value": 167},
                    {"name": "工业园区站", "coord": [109.17, 21.52], "value": 150},
                ],
            },
        },
    }


def build_dispatch_payload() -> dict[str, Any]:
    dashboard = build_dashboard_payload()
    forecast = dashboard["ai_forecast"]
    alerts = dashboard["ai_alerts"]["predictions"]
    recommendations = dashboard["ai_dispatch"]["recommendations"]
    peak_index = max(range(len(forecast["collection_forecast"])), key=lambda idx: forecast["collection_forecast"][idx])
    station_lookup = {station["name"]: station for station in dashboard["stations"]}
    dispatch_links = [
        {
            "from": "工业园区站",
            "to": "北部湾广场站",
            "volume": 18,
            "reason": "高负荷分流",
            "from_load_pct": 92,
            "to_spare_pct": 24,
        },
        {
            "from": "工业园区站",
            "to": "老城转运站",
            "volume": 14,
            "reason": "转运压力缓释",
            "from_load_pct": 92,
            "to_spare_pct": 18,
        },
        {
            "from": "老城转运站",
            "to": "银滩站",
            "volume": 10,
            "reason": "跨区调度补位",
            "from_load_pct": 78,
            "to_spare_pct": 32,
        },
    ]

    dispatch_map_points = []
    for station in dashboard["stations"]:
        point = {
            "id": station["id"],
            "name": station["name"],
            "district": station["district"],
            "status": station["status"],
            "daily_tons": station["daily_tons"],
            "lat": station["lat"],
            "lng": station["lng"],
            "load_pct": 60,
        }
        for alert in dashboard["capacity_alerts"]["alerts"]:
            if alert["station"] == station["name"]:
                point["load_pct"] = alert["load_pct"]
                point["alert_level"] = alert["level"]
                break
        else:
            point["alert_level"] = "normal"
        dispatch_map_points.append(point)

    return {
        "meta": {
            "title": "北海市环保调度中心",
            "subtitle": "AI 预警、调度建议与未来 24 小时预测联动看板",
        },
        "summary": {
            "warning_count": len(alerts),
            "urgent_count": sum(1 for item in alerts if item["level"] in {"danger", "warning"}),
            "dispatch_count": len(recommendations),
            "peak_hour": forecast["hours"][peak_index],
            "peak_load": forecast["collection_forecast"][peak_index],
            "top_action": recommendations[0]["action"] if recommendations else "--",
        },
        "alerts": dashboard["ai_alerts"],
        "dispatch": dashboard["ai_dispatch"],
        "forecast": dashboard["ai_forecast"],
        "capacity_alerts": dashboard["capacity_alerts"],
        "transport": dashboard["transport"],
        "environment": dashboard["environment"],
        "stations": dashboard["stations"],
        "dispatch_map": {
            "points": dispatch_map_points,
            "links": [
                {
                    **link,
                    "from_coord": [station_lookup[link["from"]]["lng"], station_lookup[link["from"]]["lat"]],
                    "to_coord": [station_lookup[link["to"]]["lng"], station_lookup[link["to"]]["lat"]],
                }
                for link in dispatch_links
            ],
        },
    }


def load_beihai_districts() -> dict[str, Any]:
    return json.loads(BEIHAI_DISTRICTS_PATH.read_text(encoding="utf-8"))


def load_guangxi_cities() -> dict[str, Any]:
    return json.loads(GUANGXI_CITIES_PATH.read_text(encoding="utf-8"))


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/stations/<station_id>")
def station_detail_page(station_id: str) -> str:
    station = get_station_by_id(station_id)
    if station is None:
        abort(404)
    return render_template("station_detail.html", station_id=station_id)


@app.route("/assessment")
def assessment_page() -> str:
    return render_template("assessment.html")


@app.route("/dispatch")
def dispatch_page() -> str:
    return render_template("dispatch.html")


@app.get("/api/dashboard")
def dashboard_api():
    return jsonify(build_dashboard_payload())


@app.get("/api/stations/<station_id>")
def station_api(station_id: str):
    station = get_station_by_id(station_id)
    if station is None:
        return jsonify({"error": "station not found"}), 404
    return jsonify(station)


@app.get("/api/assessment")
def assessment_api():
    return jsonify(build_assessment_payload())


@app.get("/api/dispatch")
def dispatch_api():
    return jsonify(build_dispatch_payload())


@app.get("/api/beihai-districts")
def beihai_districts_api():
    return jsonify(load_beihai_districts())


@app.get("/api/guangxi-cities")
def guangxi_cities_api():
    return jsonify(load_guangxi_cities())


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
