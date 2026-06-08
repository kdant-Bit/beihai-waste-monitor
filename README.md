# 北海市垃圾管理回收可视化大屏

## 启动

推荐在项目目录创建独立虚拟环境，避免系统 Python 与 Anaconda 环境冲突：

```powershell
cd D:\codex-code\beihai-waste-monitor
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

启动后访问：

```text
http://127.0.0.1:5000/
```

## 接口

- `GET /api/dashboard`：返回首页所有指标、图表数据、地图点位
- `GET /api/stations/<station_id>`：返回单个垃圾收集点位详情，包括：
  - 分类分布
  - 日处理垃圾量
  - 负责人
  - 设备在线数量
  - 近 7 日处理趋势
