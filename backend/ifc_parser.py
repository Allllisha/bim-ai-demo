import ifcopenshell
import ifcopenshell.util.element
import ifcopenshell.geom
from typing import Dict, Any, List
import logging
import json

logger = logging.getLogger(__name__)


def parse_ifc_to_neo4j(file_path: str, session_id: str, neo4j_service):
    """Parse IFC file and store data in Neo4j"""
    ifc_file = ifcopenshell.open(file_path)
    
    # Clear existing data for this session
    neo4j_service.execute_query(
        "MATCH (n {session_id: $session_id}) DETACH DELETE n",
        {"session_id": session_id}
    )
    
    geometry_data = []
    
    # Set up geometry processing
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    
    # Get all products (geometric elements)
    products = ifc_file.by_type("IfcProduct")
    
    # Process geometry for visualization
    logger.info(f"Found {len(products)} products to process")
    processed_count = 0
    
    for product in products[:100]:  # Limit for performance
        try:
            if product.Representation:
                logger.info(f"Processing {product.is_a()}: {product.GlobalId}")
                shape = ifcopenshell.geom.create_shape(settings, product)
                if shape:
                    # Extract vertices and faces
                    verts = shape.geometry.verts
                    faces = shape.geometry.faces
                    
                    logger.info(f"  - Vertices: {len(verts)}, Faces: {len(faces)}")
                    
                    # Convert to format suitable for Three.js
                    vertices = []
                    for i in range(0, len(verts), 3):
                        vertices.extend([verts[i], verts[i+1], verts[i+2]])
                    
                    indices = []
                    for i in range(0, len(faces), 3):
                        indices.extend([faces[i], faces[i+1], faces[i+2]])
                    
                    if len(vertices) > 0 and len(indices) > 0:
                        geometry_info = {
                            "type": product.is_a(),
                            "guid": product.GlobalId,
                            "name": product.Name or "",
                            "vertices": vertices,
                            "indices": indices
                        }
                        geometry_data.append(geometry_info)
                        processed_count += 1
                        logger.info(f"  - Added geometry data for {product.is_a()}")
                    else:
                        logger.warning(f"  - No valid geometry data for {product.is_a()}")
                else:
                    logger.warning(f"  - Could not create shape for {product.is_a()}")
            else:
                logger.info(f"Skipping {product.is_a()} - no representation")
        except Exception as e:
            logger.warning(f"Could not process geometry for {product.is_a()}: {e}")
    
    logger.info(f"Successfully processed geometry for {processed_count} elements")
    
    # Parse building
    buildings = ifc_file.by_type("IfcBuilding")
    for building in buildings:
        building_data = extract_element_data(building)
        building_data["session_id"] = session_id
        neo4j_service.execute_query(
            """
            CREATE (b:IfcBuilding {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                description: $description
            })
            """,
            building_data
        )
    
    # Parse building storeys
    storeys = ifc_file.by_type("IfcBuildingStorey")
    for storey in storeys:
        storey_data = extract_element_data(storey)
        storey_data["session_id"] = session_id
        storey_data["elevation"] = float(storey.Elevation) if hasattr(storey, 'Elevation') and storey.Elevation else 0.0
        
        neo4j_service.execute_query(
            """
            CREATE (s:IfcBuildingStorey {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                elevation: $elevation,
                description: $description
            })
            """,
            storey_data
        )
        
        # Create relationship to building
        if hasattr(storey, 'Decomposes') and storey.Decomposes:
            for rel in storey.Decomposes:
                if rel.RelatingObject.is_a("IfcBuilding"):
                    neo4j_service.execute_query(
                        """
                        MATCH (b:IfcBuilding {guid: $building_guid, session_id: $session_id})
                        MATCH (s:IfcBuildingStorey {guid: $storey_guid, session_id: $session_id})
                        CREATE (b)-[:CONTAINS_STOREY]->(s)
                        """,
                        {
                            "building_guid": rel.RelatingObject.GlobalId,
                            "storey_guid": storey.GlobalId,
                            "session_id": session_id
                        }
                    )
    
    # Parse spaces
    spaces = ifc_file.by_type("IfcSpace")
    for space in spaces:
        space_data = extract_element_data(space)
        space_data["session_id"] = session_id
        
        neo4j_service.execute_query(
            """
            CREATE (sp:IfcSpace {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                description: $description
            })
            """,
            space_data
        )
        
        # Create relationship to storey
        if hasattr(space, 'Decomposes') and space.Decomposes:
            for rel in space.Decomposes:
                if rel.RelatingObject.is_a("IfcBuildingStorey"):
                    neo4j_service.execute_query(
                        """
                        MATCH (s:IfcBuildingStorey {guid: $storey_guid, session_id: $session_id})
                        MATCH (sp:IfcSpace {guid: $space_guid, session_id: $session_id})
                        CREATE (s)-[:CONTAINS_SPACE]->(sp)
                        """,
                        {
                            "storey_guid": rel.RelatingObject.GlobalId,
                            "space_guid": space.GlobalId,
                            "session_id": session_id
                        }
                    )
    
    # Parse doors
    doors = ifc_file.by_type("IfcDoor")
    for door in doors:
        door_data = extract_element_data(door)
        door_data["session_id"] = session_id
        
        neo4j_service.execute_query(
            """
            CREATE (d:IfcDoor {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                description: $description
            })
            """,
            door_data
        )
    
    # Parse windows
    windows = ifc_file.by_type("IfcWindow")
    for window in windows:
        window_data = extract_element_data(window)
        window_data["session_id"] = session_id
        
        neo4j_service.execute_query(
            """
            CREATE (w:IfcWindow {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                description: $description
            })
            """,
            window_data
        )
    
    # Parse building element proxies (walls, columns, etc.)
    element_proxies = ifc_file.by_type("IfcBuildingElementProxy")
    for element in element_proxies:
        element_data = extract_element_data(element)
        element_data["session_id"] = session_id
        
        neo4j_service.execute_query(
            """
            CREATE (e:IfcBuildingElementProxy {
                guid: $guid,
                name: $name,
                session_id: $session_id,
                description: $description
            })
            """,
            element_data
        )
    
    # Parse furniture and furnishing elements
    # Note: IfcFurniture only exists in IFC4, not in IFC2X3
    # For IFC2X3, we'll look for IfcFurnishingElement instead
    furniture_types = ["IfcFurnishingElement"]
    
    # Try to parse IfcFurniture if it exists (IFC4)
    try:
        if hasattr(ifc_file.schema, 'declaration_by_name') and ifc_file.schema.declaration_by_name('IfcFurniture'):
            furniture_types.append("IfcFurniture")
    except:
        logger.info("IfcFurniture not available in this IFC schema version")
    
    for furniture_type in furniture_types:
        try:
            furniture_elements = ifc_file.by_type(furniture_type)
            if furniture_elements:
                logger.info(f"Found {len(furniture_elements)} {furniture_type} elements")
                for furniture in furniture_elements:
                    furniture_data = extract_element_data(furniture)
                    furniture_data["session_id"] = session_id
                    furniture_data["element_type"] = furniture_type
                    
                    neo4j_service.execute_query(
                        f"""
                        CREATE (f:IfcFurnishingElement {{
                            guid: $guid,
                            name: $name,
                            session_id: $session_id,
                            description: $description,
                            element_type: $element_type
                        }})
                        """,
                        furniture_data
                    )
        except Exception as e:
            logger.warning(f"Could not parse {furniture_type}: {e}")
    
    # Parse all other IFC elements to ensure nothing is missed
    all_element_types = [
        "IfcWall", "IfcSlab", "IfcRoof", "IfcColumn", "IfcBeam",
        "IfcStair", "IfcRamp", "IfcRailing", "IfcCurtainWall",
        "IfcPlate", "IfcMember", "IfcFooting", "IfcPile",
        "IfcFlowSegment", "IfcFlowFitting", "IfcFlowTerminal",
        "IfcFlowController", "IfcFlowMovingDevice", "IfcFlowStorageDevice",
        "IfcFlowTreatmentDevice", "IfcEnergyConversionDevice",
        "IfcTransportElement", "IfcVirtualElement", "IfcGeographicElement",
        "IfcSystemFurnitureElement", "IfcBuildingElementPart"
    ]
    
    for element_type in all_element_types:
        try:
            elements = ifc_file.by_type(element_type)
            if elements:
                logger.info(f"Found {len(elements)} {element_type} elements")
                for element in elements:
                    element_data = extract_element_data(element)
                    element_data["session_id"] = session_id
                    element_data["element_type"] = element_type
                    
                    # Create node with both generic IfcElement label and specific type label
                    neo4j_service.execute_query(
                        f"""
                        CREATE (n:IfcElement:{element_type} {{
                            guid: $guid,
                            name: $name,
                            session_id: $session_id,
                            description: $description,
                            element_type: $element_type
                        }})
                        """,
                        element_data
                    )
        except Exception as e:
            # Some element types may not exist in all IFC versions
            logger.debug(f"Element type {element_type} not found in this IFC file: {e}")
    
    # Parse and create relationships for all elements
    logger.info("Creating relationships between elements...")
    
    # Get all elements and create spatial containment relationships
    all_products = ifc_file.by_type("IfcProduct")
    furniture_count = 0
    for product in all_products:
        # Special logging for furniture elements
        if product.is_a("IfcFurnishingElement"):
            furniture_count += 1
            logger.info(f"Processing furniture element: {product.Name} ({product.GlobalId})")
            
        # Check for spatial containment
        if hasattr(product, 'ContainedInStructure') and product.ContainedInStructure:
            for rel in product.ContainedInStructure:
                relating_structure = rel.RelatingStructure
                if relating_structure:
                    # Log furniture containment specifically
                    if product.is_a("IfcFurnishingElement"):
                        logger.info(f"  Furniture {product.Name} contained in {relating_structure.is_a()}: {relating_structure.Name}")
                    
                    neo4j_service.execute_query(
                        """
                        MATCH (container {guid: $container_guid, session_id: $session_id})
                        MATCH (element {guid: $element_guid, session_id: $session_id})
                        CREATE (container)-[:CONTAINS]->(element)
                        """,
                        {
                            "container_guid": relating_structure.GlobalId,
                            "element_guid": product.GlobalId,
                            "session_id": session_id
                        }
                    )
        
        # Check for aggregation relationships
        if hasattr(product, 'Decomposes') and product.Decomposes:
            for rel in product.Decomposes:
                if hasattr(rel, 'RelatingObject') and rel.RelatingObject:
                    neo4j_service.execute_query(
                        """
                        MATCH (parent {guid: $parent_guid, session_id: $session_id})
                        MATCH (child {guid: $child_guid, session_id: $session_id})
                        CREATE (parent)-[:DECOMPOSES]->(child)
                        """,
                        {
                            "parent_guid": rel.RelatingObject.GlobalId,
                            "child_guid": product.GlobalId,
                            "session_id": session_id
                        }
                    )
    
    logger.info(f"Total furniture elements processed: {furniture_count}")
    logger.info(f"Successfully parsed IFC file for session {session_id}")
    
    return geometry_data


def extract_element_data(element) -> Dict[str, Any]:
    """Extract basic data from IFC element"""
    return {
        "guid": element.GlobalId,
        "name": element.Name or "",
        "description": element.Description or ""
    }