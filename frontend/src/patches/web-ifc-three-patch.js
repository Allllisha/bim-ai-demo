// Patch for web-ifc-three compatibility with three.js 0.149
// This file is not used directly, but documents the needed changes

// In web-ifc-three/IFCLoader.js, the import should be:
// import { mergeBufferGeometries as mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

// Or in the code, replace:
// mergeGeometries(geometries)
// with:
// mergeBufferGeometries(geometries)