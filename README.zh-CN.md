# NODE · License Graph Studio

面向 PayPal AI Hackathon 的「03 许可修复」本地可运行项目。它把场景物体、共享素材和许可凭据连成依赖图，找出覆盖全部阻断资源且总价最低的替换组合。当前为单人 MVP，默认只在本机运行。

## 运行

需要 Node.js 24+。在此目录执行：

```powershell
npm install
npm test
npm run build
npm run server
```

浏览器打开 `http://127.0.0.1:4174`。点击共享资源可同时高亮引用它的物体；「预览修复」对照修复前后；「本地演示解锁」不产生交易，但可测试完整 ZIP 导出。ZIP 包含修改后的 GLB、程序生成的材质 PNG、警报 WAV、替换映射清单和素材使用许可。

导入支持 `.glb` 和项目 JSON 场景清单。GLB 的网格与共享材质会被解析到依赖图，所有未提供的许可先标为待核验；不会把导入素材误标为已授权。导入场景暂不进入自营素材包的 Sandbox 结算。JSON 应包含 `id`、`title`、`version`、`objects`、`assets`；物体需要 `id`、`name`、`assetIds`，素材需要 `id`、`name`、`type`、`usedBy`、`license`。可参照 `src/demo-data.js`。

## AI 提取

已接入本地 Ollama `qwen2.5:7b`。展开「AI 许可条款提取」，粘贴原文后获取商业使用、再分发、证据摘录和解释。模型摘录必须能在原文中逐字定位，输出始终是**待人工核验草稿**。只有用户点击核对确认，确定性许可规则才会更新。未明确许可、缺失或待核验均阻断交付。许可判定不是法律意见。

若尚未安装模型，可先按 [Ollama 官方文档](https://ollama.com/blog/structured-outputs)安装并运行本地服务，再执行 `ollama pull qwen2.5:7b`。AI 提取以外的依赖分析、修复优化和导出不依赖模型。

## PayPal Sandbox

服务端实现 OAuth、Orders v2 创建、买家批准后的订单查询与捕获、金额/币种/报价绑定核对、稳定幂等 ID 和已完成订单的重复请求处理。仅使用 Sandbox 主机。界面只有在本机 `.env` 中配置 Sandbox 凭据后才启用购买按钮：

```powershell
Copy-Item .env.example .env
# 在本机编辑 .env 中的 PAYPAL_CLIENT_ID 与 PAYPAL_CLIENT_SECRET
npm run server
```

不要提交 `.env`。内置示例场景的未修改版本可购买 `$6.49` 的自营程序生成替换素材包；导入或编辑后的场景不会自动售卖。结算后服务端只有在 `COMPLETED` 捕获记录、金额、币种和报价全部匹配时才返回解锁权益。由于当前没有用户的 Sandbox 凭据，**真实 Sandbox 下单与买家批准回跳尚未完成实测**；本地演示解锁与真实权益分别标识。

开发前端可运行 `npm run dev`（Vite 代理 API 到 4174）。此时如需测试 Sandbox 回跳，把 `.env` 中 `PUBLIC_ORIGIN` 改为 `http://127.0.0.1:5173`；直接运行构建版则保持 4174。

## 项目结构

- `src/engine.js`：许可规则、依赖影响、精确最小成本覆盖与修复映射。
- `src/main.js`：Three.js 场景、关系图、导入、前后对照、AI 审核和 ZIP 导出。
- `server/ai.js`：本地 Qwen 结构化许可提取。
- `server/paypal.js`：PayPal Sandbox 请求及捕获核对。
- `server/index.js`：本机 API、订单记录和构建版静态服务。
- `DESIGN.md`：Work Buddy 的两套视觉提案与当前实现取舍。

## 当前边界

示例场景为程序生成的几何与素材，3D 仅展示物体和共享资源的空间分布，不做物理仿真。导入 GLB 会抽取网格与材质依赖；外部许可文本需人工核验，导入模型本身的几何许可也需要项目所有者确认。当前订单记录保存在本机 `.data/orders.json`，仅适合单机演示；公开部署前需要用户账户绑定、数据库、Webhook 校验、退款状态同步与更多支付异常恢复测试。
