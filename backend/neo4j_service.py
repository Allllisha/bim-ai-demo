from neo4j import GraphDatabase
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class Neo4jService:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.auth = tuple(os.getenv("NEO4J_AUTH", "neo4j/password123").split("/"))
        self.driver = GraphDatabase.driver(self.uri, auth=self.auth)
    
    def close(self):
        self.driver.close()
    
    def verify_connection(self):
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info("Neo4j connection verified")
        except Exception as e:
            logger.error(f"Neo4j connection failed: {e}")
            raise
    
    def execute_query(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [dict(record) for record in result]
    
    def create_constraints(self):
        """Create necessary constraints and indexes"""
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (b:IfcBuilding) REQUIRE b.guid IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (s:IfcBuildingStorey) REQUIRE s.guid IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (sp:IfcSpace) REQUIRE sp.guid IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (d:IfcDoor) REQUIRE d.guid IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (w:IfcWindow) REQUIRE w.guid IS UNIQUE",
            "CREATE INDEX IF NOT EXISTS FOR (n:IfcBuilding) ON (n.session_id)",
            "CREATE INDEX IF NOT EXISTS FOR (n:IfcBuildingStorey) ON (n.session_id)",
            "CREATE INDEX IF NOT EXISTS FOR (n:IfcSpace) ON (n.session_id)",
        ]
        
        with self.driver.session() as session:
            for constraint in constraints:
                try:
                    session.run(constraint)
                except Exception as e:
                    logger.warning(f"Could not create constraint: {e}")