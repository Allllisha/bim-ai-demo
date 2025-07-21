# BIM × AI デモシステム

鹿島建設向けのBIM（建築情報モデリング）と生成AIを組み合わせたプロトタイプアプリケーション

## 概要

このシステムは、IFCファイルをブラウザ上で3D可視化し、自然言語での問い合わせを通じて建物データを分析できるプラットフォームです。AI建築コンサルタントが建物の特性を専門的に分析し、価値ある洞察を提供します。

## 主要機能

### 🏗️ IFCファイル処理
- IFCファイルのアップロード・解析
- 建築要素の抽出（建物、階、空間、ドア、窓、家具、材質など）
- Neo4jグラフデータベースへの構造化データ保存

### 🎨 3Dビジュアライゼーション
- IFC.js（Three.js + WebAssembly）による高品質3D表示
- リアルタイムレンダリング
- 回転・ズーム・パン操作

### 🤖 AI建築コンサルタント
- 自然言語での建物分析問い合わせ
- Cypherクエリ自動生成
- 専門的な建築知識による回答
- 日本語・英語対応

### 📊 建物分析ダッシュボード
- 建物構成要素の統計表示
- IFC要素一覧
- 材質情報（13種類以上）

### 🔧 ユーザーインターフェース
- ドラッグリサイズ可能なパネル
- レスポンシブデザイン
- プロフェッショナルなUI/UX

## 技術スタック

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript** - 型安全なJavaScript
- **Material-UI (MUI)** - UIコンポーネント
- **IFC.js** - IFC 3Dビューワー（Three.js + WebAssembly）
- **Axios** - HTTP通信

### バックエンド
- **FastAPI** - 高性能Webフレームワーク
- **Python 3.11** - サーバーサイド言語
- **ifcopenshell** - IFCファイル解析
- **Neo4j** - グラフデータベース
- **Anthropic Claude API** - 大規模言語モデル

### インフラ
- **Docker** & **Docker Compose** - コンテナ化
- **Uvicorn** - ASGIサーバー

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   FastAPI       │    │   Neo4j         │
│                 │    │                 │    │                 │
│ - IFC Viewer    │◄──►│ - IFC Parser    │◄──►│ - Graph DB      │
│ - Chat Interface│    │ - API Endpoints │    │ - Building Data │
│ - Analytics     │    │ - Claude Service│    │ - Materials     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Anthropic       │
                       │ Claude API      │
                       │                 │
                       │ - NL to Cypher  │
                       │ - AI Analysis   │
                       └─────────────────┘
```

## セットアップ

### 前提条件
- Docker & Docker Compose
- Node.js 18+ (開発時)
- Python 3.11+ (開発時)

### 環境変数
```bash
# .env ファイルを作成
CLAUDE_API_KEY=your_anthropic_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEO4J_URI=bolt://neo4j:7687
NEO4J_AUTH=neo4j/password123
REACT_APP_API_URL=http://localhost:8001
```

### 起動方法
```bash
# リポジトリクローン
git clone https://github.com/Allllisha/bim-ai-demo.git
cd bim-ai-demo

# Docker Compose で起動
docker-compose up -d

# アプリケーションにアクセス
http://localhost:3000
```

### ポート構成
- **Frontend**: `3000` - React開発サーバー
- **Backend**: `8001` - FastAPI APIサーバー  
- **Neo4j Browser**: `7474` - データベース管理画面
- **Neo4j Bolt**: `7687` - データベース接続

## 使用方法

### 1. IFCファイルのアップロード
1. アプリケーションにアクセス
2. IFCファイルをドラッグ&ドロップまたはファイル選択
3. 自動的に解析・3D表示が開始

### 2. 3Dモデルの操作
- **回転**: 左クリック + ドラッグ
- **ズーム**: マウスホイール
- **パン**: 右クリック + ドラッグ

### 3. パネルリサイズ
- 左右パネルの境界をドラッグして比率調整
- 最小幅40%〜最大幅80%

### 4. AI建築コンサルタント
**基本的な質問例:**
- "何階建てですか？"
- "部屋数は？"
- "窓の数は？"
- "この建物の設計を分析してください"

**材質関連の質問例:**
- "Glassは何に使われていますか？"
- "Cherryは何に使われていますか？"
- "材質の種類は？"
- "コンクリート製の要素は？"

**高度な分析例:**
- "エネルギー効率について教えて"
- "建築基準法への適合性は？"
- "設計改善の提案をください"
- "コスト分析をお願いします"

## データ処理の詳細

### IFC要素の抽出
システムは以下のIFC要素を処理します：

**建築要素**
- IfcBuilding - 建物
- IfcBuildingStorey - 階
- IfcSpace - 空間・部屋
- IfcWall - 壁
- IfcSlab - 床・屋根スラブ
- IfcColumn - 柱
- IfcBeam - 梁
- IfcStair - 階段
- IfcRamp - スロープ
- IfcRailing - 手すり

**開口部**
- IfcWindow - 窓
- IfcDoor - ドア

**家具・設備**
- IfcFurnishingElement - 家具
- IfcSystemFurnitureElement - システム家具
- IfcTransportElement - 輸送設備（エレベーター等）

**設備・インフラ**
- IfcFlowSegment - 配管・ダクト
- IfcFlowTerminal - 設備機器
- IfcFlowFitting - 継手
- IfcEnergyConversionDevice - HVAC設備

### 材質情報の処理
**対応する材質タイプ**
- IfcMaterial - 単一材質
- IfcMaterialLayerSet - 層状材質セット
- IfcMaterialLayerSetUsage - 層状材質の使用
- IfcMaterialList - 材質リスト
- IfcMaterialConstituentSet - 材質構成セット

**関係性の構築**
- `HAS_MATERIAL` - 要素→材質
- `HAS_MATERIAL_LAYER_SET` - 要素→層状材質セット
- `CONTAINS_LAYER` - 層状材質→個別材質
- `CONTAINS` - 空間的包含関係
- `DECOMPOSES` - 構成要素の分解関係

## ファイル構造

```
archi_demo/
├── frontend/                  # React フロントエンド
│   ├── src/
│   │   ├── components/       # React コンポーネント
│   │   │   ├── FileUpload.tsx
│   │   │   ├── IfcViewer.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── BuildingInfo.tsx
│   │   │   └── ResizablePanels.tsx
│   │   ├── App.tsx
│   │   └── theme.ts
│   └── package.json
├── backend/                   # FastAPI バックエンド
│   ├── main.py               # APIエンドポイント
│   ├── ifc_parser.py         # IFC解析エンジン
│   ├── neo4j_service.py      # Neo4j データベース操作
│   ├── claude_service.py     # Claude AI サービス
│   └── requirements.txt
├── data/
│   └── uploads/              # アップロードファイル保存
├── docker-compose.yml        # Docker設定
├── .env                      # 環境変数
├── .gitignore
├── CLAUDE.md                # プロジェクト要件定義
└── README.md                # このファイル
```

## API仕様

### POST /upload_ifc
IFCファイルのアップロード

**Request:**
```
Content-Type: multipart/form-data
file: [IFC file]
```

**Response:**
```json
{
  "session_id": "uuid-string",
  "geometry": [...]
}
```

### POST /chat
AI建築コンサルタントへの質問

**Request:**
```json
{
  "session_id": "uuid-string",
  "question": "質問内容",
  "conversation_history": []
}
```

**Response:**
```json
{
  "response": "AI回答"
}
```

### GET /building-info/{session_id}
建物情報の取得

**Response:**
```json
{
  "session_id": "uuid-string",
  "building_info": {
    "building": {...},
    "floors": {"count": 2, "names": [...]},
    "spaces": {"count": 8, "names": [...]},
    "windows": {"count": 42},
    "doors": {"count": 18},
    "materials": {"count": 13, "names": [...]}
  }
}
```

## トラブルシューティング

### よくある問題

**1. Claude API "Overloaded" エラー**
```
Error code: 529 - {'type': 'overloaded_error', 'message': 'Overloaded'}
```
**解決策:** しばらく時間を置いてから再試行

**2. Neo4j 接続エラー**
```
Failed to establish connection to neo4j:7687
```
**解決策:** 
```bash
docker-compose restart neo4j
docker-compose restart backend
```

**3. IFCファイル解析失敗**
**解決策:** 
- ファイル形式がIFCであることを確認
- ファイルサイズが適切であることを確認
- ログでエラー詳細を確認: `docker-compose logs backend`

### ログの確認
```bash
# 全体的なログ
docker-compose logs

# バックエンドのみ
docker-compose logs backend

# 材質解析のログ
docker-compose logs backend | grep -E "(material|Material)"

# エラーのみ
docker-compose logs backend | grep -E "(ERROR|Error|error)"
```

## 開発情報

### パフォーマンス考慮事項
- IFC解析は最初の100要素に制限（performance考慮）
- 材質関連付けは全要素を処理
- 3D表示は最大1000要素

### 拡張可能性
- 他のIFCバージョン対応
- 追加のAI分析機能
- エクスポート機能
- マルチテナント対応

### セキュリティ
- アップロードファイルはセッション終了時に削除
- APIアクセス制限
- 環境変数による設定管理

## 実装された主要機能の詳細

### ドラッグリサイズパネル
- 左右パネルの境界をマウスでドラッグして比率を調整可能
- 初期比率: 70:30（3D表示:分析パネル）
- 調整範囲: 40:60 ～ 80:20
- スムーズなアニメーション付き

### 材質解析エンジン
- 13種類以上の材質を自動抽出
- 材質と建築要素の関連付け
- 複合材質（層状材質セット等）の処理
- 材質別要素検索機能

### AI分析機能
- 自然言語からCypherクエリへの自動変換
- 建築専門知識による回答生成
- 会話履歴の考慮
- エラー時のフォールバック機能

## ライセンス

このプロジェクトは鹿島建設向けデモンストレーション目的で作成されています。

## 貢献者

- Claude (Anthropic) - AI開発支援
- 開発チーム - システム設計・実装

---

**最終更新:** 2025年7月21日  
**バージョン:** 1.0.0  
**デモ予定:** 2025年7月22日 10:00 鹿島建設向け