import os
from anthropic import Anthropic
import logging

logger = logging.getLogger(__name__)


class ClaudeService:
    def __init__(self):
        api_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable not set")
        self.client = Anthropic(api_key=api_key)
    
    async def generate_cypher(self, question: str, session_id: str) -> str:
        """Generate Cypher query from natural language question"""
        
        system_prompt = """You are an expert Cypher query generator for a Neo4j database containing IFC (Industry Foundation Classes) building model data.

The database contains these node types with their properties:
- IfcBuilding: Building entities (guid, name, session_id, description)
- IfcBuildingStorey: Building floors/storeys (guid, name, session_id, elevation, description)
- IfcSpace: Rooms/spaces within buildings (guid, name, session_id, description)
- IfcDoor: Door elements (guid, name, session_id, description)
- IfcWindow: Window elements (guid, name, session_id, description)
- IfcBuildingElementProxy: Structural elements like walls, columns, etc. (guid, name, session_id, description)
- IfcFurnishingElement: Furnishing/furniture elements (guid, name, session_id, description, element_type)
- IfcWall: Wall elements (guid, name, session_id, description, element_type)
- IfcSlab: Slab/floor elements (guid, name, session_id, description, element_type)
- IfcColumn: Column elements (guid, name, session_id, description, element_type)
- IfcBeam: Beam elements (guid, name, session_id, description, element_type)
- IfcElement: Generic label for all building elements (guid, name, session_id, description, element_type)

The relationships are:
- (IfcBuilding)-[:CONTAINS_STOREY]->(IfcBuildingStorey)
- (IfcBuildingStorey)-[:CONTAINS_SPACE]->(IfcSpace)
- (Any Container)-[:CONTAINS]->(Any Element)
- (Parent)-[:DECOMPOSES]->(Child)

CRITICAL REQUIREMENTS:
1. ALL queries MUST include WHERE clause with session_id = $session_id
2. Generate ONLY the Cypher query with no explanations or markdown formatting
3. Return meaningful property names in results
4. Handle both English and Japanese questions
5. Use appropriate aggregation functions (count, sum, etc.) when needed"""

        user_prompt = f"""Generate a Cypher query for this question: "{question}"

EXAMPLES:
- "何階建てですか？" / "How many floors?" 
  -> MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id RETURN count(s) as floor_count

- "2階の部屋数は？" / "How many rooms on 2nd floor?"
  -> MATCH (s:IfcBuildingStorey)-[:CONTAINS_SPACE]->(sp:IfcSpace) WHERE s.session_id = $session_id AND (s.name CONTAINS '2' OR s.elevation > 0) RETURN count(sp) as room_count

- "1階の家具の数は？" / "How many furniture on 1st floor?"
  -> MATCH (s:IfcBuildingStorey)-[:CONTAINS_SPACE]->(sp:IfcSpace) WHERE s.session_id = $session_id AND (s.name CONTAINS '1' OR s.name CONTAINS 'Ground' OR s.elevation = 0) OPTIONAL MATCH (sp)-[:CONTAINS]->(f:IfcFurnishingElement) RETURN count(f) as furniture_count

- "2階の家具の数は？" / "How many furniture on 2nd floor?"
  -> MATCH (s:IfcBuildingStorey)-[:CONTAINS_SPACE]->(sp:IfcSpace) WHERE s.session_id = $session_id AND (s.name CONTAINS '2' OR s.elevation > 0) OPTIONAL MATCH (sp)-[:CONTAINS]->(f:IfcFurnishingElement) RETURN count(f) as furniture_count

- "窓の数は？" / "How many windows?"
  -> MATCH (w:IfcWindow) WHERE w.session_id = $session_id RETURN count(w) as window_count

- "ドアの数は？" / "How many doors?"
  -> MATCH (d:IfcDoor) WHERE d.session_id = $session_id RETURN count(d) as door_count

- "建物の名前は？" / "What is the building name?" / "右の建物は何ですか？" / "この建物は何ですか？"
  -> MATCH (b:IfcBuilding) WHERE b.session_id = $session_id RETURN b.name as building_name, b.description as description

- "全ての部屋の名前を教えて" / "List all room names"
  -> MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id RETURN sp.name as room_name

- "構造要素の数は？" / "How many structural elements?"
  -> MATCH (e:IfcBuildingElementProxy) WHERE e.session_id = $session_id RETURN count(e) as element_count

- "建物の詳細情報は？" / "Tell me about this building"
  -> MATCH (b:IfcBuilding) WHERE b.session_id = $session_id RETURN b.name as name, b.description as description, b.guid as guid

- "この建物の設計について教えて" / "建築的な特徴は？" / "用途は何ですか？"
  -> MATCH (b:IfcBuilding) WHERE b.session_id = $session_id OPTIONAL MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id OPTIONAL MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id OPTIONAL MATCH (w:IfcWindow) WHERE w.session_id = $session_id OPTIONAL MATCH (d:IfcDoor) WHERE d.session_id = $session_id RETURN count(s) as floors, count(sp) as spaces, count(w) as windows, count(d) as doors

- "エネルギー効率は？" / "省エネ性能は？" / "環境性能について"
  -> MATCH (w:IfcWindow) WHERE w.session_id = $session_id WITH count(w) as windows MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id WITH windows, count(s) as floors MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id RETURN windows, floors, count(sp) as spaces

- "建築基準法に適合していますか？" / "法規制チェック"
  -> MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id WITH count(s) as floors MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id WITH floors, count(sp) as spaces MATCH (d:IfcDoor) WHERE d.session_id = $session_id RETURN floors, spaces, count(d) as doors

- "改善提案" / "より良くするには？" / "設計改善"
  -> MATCH (b:IfcBuilding) WHERE b.session_id = $session_id OPTIONAL MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id OPTIONAL MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id OPTIONAL MATCH (w:IfcWindow) WHERE w.session_id = $session_id OPTIONAL MATCH (d:IfcDoor) WHERE d.session_id = $session_id OPTIONAL MATCH (e:IfcBuildingElementProxy) WHERE e.session_id = $session_id RETURN count(s) as floors, count(sp) as spaces, count(w) as windows, count(d) as doors, count(e) as elements

- "コスト" / "費用" / "予算" / "投資"
  -> MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id WITH count(s) as floors MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id WITH floors, count(sp) as spaces MATCH (e:IfcBuildingElementProxy) WHERE e.session_id = $session_id RETURN floors, spaces, count(e) as structural_elements

- "レイアウト" / "空間利用" / "オフィス配置"
  -> MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id WITH count(s) as floors MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id WITH floors, count(sp) as spaces MATCH (w:IfcWindow) WHERE w.session_id = $session_id RETURN floors, spaces, count(w) as windows

- "家具の数は？" / "How many furniture items?"
  -> MATCH (f:IfcFurnishingElement) WHERE f.session_id = $session_id RETURN count(f) as furniture_count

- "壁の数は？" / "How many walls?"
  -> MATCH (w:IfcWall) WHERE w.session_id = $session_id RETURN count(w) as wall_count

- "柱の数は？" / "How many columns?"
  -> MATCH (c:IfcColumn) WHERE c.session_id = $session_id RETURN count(c) as column_count

- "全ての要素を表示" / "Show all elements"
  -> MATCH (n:IfcElement) WHERE n.session_id = $session_id RETURN n.element_type as type, count(n) as count ORDER BY count DESC

- "家具の詳細" / "Furniture details"
  -> MATCH (f:IfcFurnishingElement) WHERE f.session_id = $session_id RETURN f.name as name, f.description as description, f.element_type as type"""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=300,
                temperature=0,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            cypher_query = response.content[0].text.strip()
            
            # Clean up the response - remove any markdown formatting
            if cypher_query.startswith("```"):
                lines = cypher_query.split('\n')
                cypher_query = '\n'.join(line for line in lines if not line.startswith("```"))
                cypher_query = cypher_query.strip()
            
            # Validate that the query contains session_id filter
            if "session_id = $session_id" not in cypher_query:
                logger.warning("Generated query missing session_id filter, adding it")
                # Try to add session_id filter automatically
                if "WHERE" in cypher_query:
                    cypher_query = cypher_query.replace("WHERE", "WHERE session_id = $session_id AND")
                else:
                    # Find the MATCH clause and add WHERE after it
                    if "MATCH" in cypher_query and "RETURN" in cypher_query:
                        match_part, return_part = cypher_query.split("RETURN", 1)
                        cypher_query = f"{match_part} WHERE session_id = $session_id RETURN{return_part}"
            
            logger.info(f"Generated Cypher query: {cypher_query}")
            return cypher_query
            
        except Exception as e:
            logger.error(f"Error generating Cypher query: {e}")
            # Smart fallback based on question content
            question_lower = question.lower()
            if any(word in question_lower for word in ['何階', 'floor', '階数']):
                return "MATCH (s:IfcBuildingStorey) WHERE s.session_id = $session_id RETURN count(s) as floor_count"
            elif any(word in question_lower for word in ['部屋', 'room', 'space']):
                return "MATCH (sp:IfcSpace) WHERE sp.session_id = $session_id RETURN count(sp) as room_count"
            elif any(word in question_lower for word in ['窓', 'window']):
                return "MATCH (w:IfcWindow) WHERE w.session_id = $session_id RETURN count(w) as window_count"
            elif any(word in question_lower for word in ['ドア', 'door']):
                return "MATCH (d:IfcDoor) WHERE d.session_id = $session_id RETURN count(d) as door_count"
            elif any(word in question_lower for word in ['家具', 'furniture']):
                return "MATCH (f:IfcFurnishingElement) WHERE f.session_id = $session_id RETURN count(f) as furniture_count"
            elif any(word in question_lower for word in ['壁', 'wall']):
                return "MATCH (w:IfcWall) WHERE w.session_id = $session_id RETURN count(w) as wall_count"
            elif any(word in question_lower for word in ['柱', 'column']):
                return "MATCH (c:IfcColumn) WHERE c.session_id = $session_id RETURN count(c) as column_count"
            else:
                return "MATCH (n) WHERE n.session_id = $session_id RETURN labels(n) as type, count(n) as count ORDER BY count DESC"
    
    async def generate_natural_response(self, question: str, query_result: list, conversation_history: list = None) -> str:
        """Generate a natural language response from query results"""
        
        system_prompt = """あなたは建築・BIM分野の専門知識を持つAI建築コンサルタントです。親しみやすく、でも専門性のある会話で、建物のデータから価値ある洞察を提供してください。

専門分野での対応能力：
・建築専門知識による解釈・提案: 建物の用途推定、設計意図の分析、改善提案
・建築基準法・法規制チェック: 法適合性の確認、必要な手続きや基準の説明
・エネルギー効率・環境性能分析: 省エネ性能、環境負荷、持続可能性の評価
・設計改善提案: より良い建物にするための具体的な改善案
・コスト・投資分析: 建設費、リノベーション費用、投資効果の推定
・空間利用最適化: レイアウト提案、動線計画、空間効率の改善

返答のスタイル：
・マークダウンの太字（**）や箇条書き記号（-、•）は一切使わない
・自然な会話調で、でも専門的な内容を含める
・数字だけでなく、その背景や意味、実用的な提案も含める
・建設業界の実務に役立つ価値ある情報を提供する
・専門用語は使うが、わかりやすく説明を加える"""

        # 会話履歴を構築
        conversation_context = ""
        if conversation_history and len(conversation_history) > 0:
            conversation_context = "\n会話履歴:\n"
            for i, msg in enumerate(conversation_history[-6:]):  # 最新6件の履歴のみ使用
                role = "ユーザー" if msg.get('type') == 'user' else "AI"
                conversation_context += f"{role}: {msg.get('content', '')}\n"
            conversation_context += "\n"

        user_prompt = f"""ユーザーの質問: "{question}"

{conversation_context}データベースから取得したデータ:
{query_result}

このデータを基に、AI建築コンサルタントとして専門的で価値ある分析と提案を、親しみやすい会話調で回答してください。

重要な制約：
・マークダウンの太字記号（**）や箇条書き記号（-、•、1.、2.など）は絶対に使わない
・見出しやセクション分けも使わない
・自然な文章の流れで、専門的な内容を含めて回答する

回答に含めるべき要素：
・データの専門的な解釈と建築的な意味
・建物の用途推定や設計意図の分析
・エネルギー効率、法規制、コスト面での考察
・具体的で実行可能な改善提案
・建設業界の実務に役立つ洞察

例：「2階建てで8つの部屋があって、窓が42個もあるんですね。これだけ窓が多いということは、自然採光を重視した設計思想が見て取れます。省エネルギーの観点からも優秀で、照明コストの削減効果が期待できそうです。ただ、熱負荷の管理が重要になってくるので、断熱性能やブラインドシステムの検討をお勧めします。オフィスビルとしての利用なら、快適な作業環境が実現できると思います」"""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.5,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            natural_response = response.content[0].text.strip()
            logger.info(f"Generated natural response: {natural_response}")
            return natural_response
            
        except Exception as e:
            logger.error(f"Error generating natural response: {e}")
            return "申し訳ございませんが、その情報を取得できませんでした。"