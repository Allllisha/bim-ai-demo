#!/usr/bin/env python3
"""
LargeBuilding.ifcファイルに含まれるIFC要素タイプを調査するスクリプト
"""

import ifcopenshell
import os
from collections import Counter
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def analyze_ifc_file(file_path):
    """IFCファイルを解析して含まれる要素タイプをカウント"""
    print(f"Analyzing IFC file: {file_path}")
    
    try:
        ifc_file = ifcopenshell.open(file_path)
        
        # 全ての要素を取得
        all_elements = ifc_file.by_type("IfcProduct")
        
        # 要素タイプごとにカウント
        element_types = Counter()
        for element in all_elements:
            element_types[element.is_a()] += 1
        
        # 結果を表示
        print(f"\n総要素数: {len(all_elements)}")
        print("\n要素タイプ別の内訳:")
        print("-" * 50)
        
        for element_type, count in sorted(element_types.items(), key=lambda x: x[1], reverse=True):
            print(f"{element_type:<30} : {count:>5} 個")
        
        # 現在パースされていない要素タイプを特定
        parsed_types = {
            "IfcBuilding", "IfcBuildingStorey", "IfcSpace", 
            "IfcDoor", "IfcWindow", "IfcBuildingElementProxy"
        }
        
        unparsed_types = set(element_types.keys()) - parsed_types
        
        print("\n" + "=" * 50)
        print("現在パースされていない要素タイプ:")
        print("-" * 50)
        for element_type in sorted(unparsed_types):
            if element_types[element_type] > 0:
                print(f"{element_type:<30} : {element_types[element_type]:>5} 個")
        
        # 家具関連の要素を特定
        furniture_related = []
        for element_type in element_types.keys():
            if "Furnishing" in element_type or "Furniture" in element_type:
                furniture_related.append((element_type, element_types[element_type]))
        
        if furniture_related:
            print("\n" + "=" * 50)
            print("家具関連の要素:")
            print("-" * 50)
            for element_type, count in furniture_related:
                print(f"{element_type:<30} : {count:>5} 個")
        
        # 具体的な要素の例を表示
        print("\n" + "=" * 50)
        print("各要素タイプの具体例:")
        print("-" * 50)
        
        for element_type in sorted(element_types.keys()):
            examples = ifc_file.by_type(element_type)[:3]  # 最初の3つの例
            if examples:
                print(f"\n{element_type}:")
                for i, example in enumerate(examples, 1):
                    name = getattr(example, 'Name', 'N/A') or 'N/A'
                    desc = getattr(example, 'Description', 'N/A') or 'N/A'
                    print(f"  例{i}: Name='{name}', Description='{desc}'")
        
    except Exception as e:
        print(f"Error analyzing IFC file: {e}")


def check_neo4j_nodes():
    """Neo4jデータベースに存在するノードタイプを確認"""
    print("\n" + "=" * 50)
    print("Neo4jデータベースの確認:")
    print("-" * 50)
    
    try:
        # Neo4j接続
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        auth = os.getenv("NEO4J_AUTH", "neo4j/password").split("/")
        driver = GraphDatabase.driver(uri, auth=(auth[0], auth[1]))
        
        with driver.session() as session:
            # 最新のセッションIDを取得
            result = session.run("""
                MATCH (n)
                WHERE n.session_id IS NOT NULL
                RETURN DISTINCT n.session_id as session_id
                ORDER BY n.session_id DESC
                LIMIT 1
            """)
            
            record = result.single()
            if record:
                session_id = record["session_id"]
                print(f"最新のセッションID: {session_id}")
                
                # そのセッションのノードタイプを確認
                result = session.run("""
                    MATCH (n)
                    WHERE n.session_id = $session_id
                    RETURN labels(n) as labels, count(n) as count
                    ORDER BY count DESC
                """, session_id=session_id)
                
                print("\nNeo4jに登録されているノードタイプ:")
                for record in result:
                    labels = record["labels"]
                    count = record["count"]
                    if labels:
                        print(f"{labels[0]:<30} : {count:>5} 個")
            else:
                print("Neo4jにデータが見つかりません")
        
        driver.close()
        
    except Exception as e:
        print(f"Neo4j接続エラー: {e}")


if __name__ == "__main__":
    # IFCファイルのパス
    ifc_path = "/Users/anemoto/archi_demo/data/LargeBuilding.ifc"
    
    # IFCファイルを解析
    analyze_ifc_file(ifc_path)
    
    # Neo4jの状態を確認
    check_neo4j_nodes()