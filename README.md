# BIM × 生成 AI デモシステム

IFCモデルをブラウザ上で可視化し、自然言語でクエリ可能なデモシステム

## セットアップ

1. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集してCLAUDE_API_KEYを設定
```

2. Dockerコンテナの起動
```bash
docker-compose up -d
```

3. ブラウザでアクセス
```
http://localhost:3000
```

## 使い方

1. LargeBuilding.ifcファイルをアップロード（data/フォルダに配置済み）
2. 3Dビューワーでモデルを確認
3. チャットで質問
   - 例: "何階建てですか？"
   - 例: "部屋の数は？"
   - 例: "窓の数を教えて"

## 技術スタック

- Frontend: React + TypeScript + IFC.js
- Backend: FastAPI (Python)
- Database: Neo4j
- AI: Anthropic Claude API

## トラブルシューティング

- ポートが使用中の場合: docker-compose.ymlでポート番号を変更
- APIキーエラー: .envファイルのCLAUDE_API_KEYを確認