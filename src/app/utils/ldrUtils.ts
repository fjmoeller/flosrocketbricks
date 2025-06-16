//helper method to do splits where the rest is appended in the last field and doesnt get cut of
import {LdrPart, PartReference} from "../model/ldrawParts";
import {BufferGeometry, MathUtils, Matrix3, Matrix4, Plane, Triangle, Vector3} from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function adjustGeometryByVersion(viewerVersion: string, partName: string, partGeometry: BufferGeometry) {
  if (viewerVersion === "V1") {
    if (partName == "28192.dat") {
      partGeometry.rotateY(-Math.PI / 2);
      partGeometry.translate(-10, -24, 0);
    } else if (partName == "68013.dat")
      partGeometry.rotateY(-Math.PI);
    else if (partName == "70681.dat")
      partGeometry.translate(0, 0, 20);
    else if (partName == "49803.dat")
      partGeometry.translate(0, -32, 0);
  } else if (viewerVersion === "V2") {
    if (partName == "63965.dat")
      partGeometry.translate(0, 1.5, 0);
    else if (partName == "5091.dat")
      partGeometry.rotateY(Math.PI / 2);
    else if (partName == "5092.dat")
      partGeometry.rotateY(Math.PI / 2);
  }
}

export function splitter(input: string, separator: string, limit: number) {
  // Ensure the separator is global
  let newSeparator = new RegExp(separator, 'g');
  // Allow the limit argument to be excluded
  limit = limit ?? -1;

  const output = [];
  let finalIndex = 0;

  while (limit--) {
    const lastIndex = newSeparator.lastIndex;
    const search = newSeparator.exec(input);
    if (search === null) {
      break;
    }
    finalIndex = newSeparator.lastIndex;
    output.push(input.slice(lastIndex, search.index));
  }

  output.push(input.slice(finalIndex));

  return output;
}

//This function parses a line type one, which is a reference to a part or a submodel in a ldr file
export function parseLineTypeOne(line: string, invert: boolean): PartReference {
  const splittedLine = splitter(line, " ", 14);
  const transform = new Matrix4();

  const invertOrNo = new Matrix3();
  invertOrNo.set(parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]));
  if (invertOrNo.determinant() < 0)
    invert = !invert;

  transform.set(
    parseFloat(splittedLine[5]), parseFloat(splittedLine[6]), parseFloat(splittedLine[7]), parseFloat(splittedLine[2]),
    parseFloat(splittedLine[8]), parseFloat(splittedLine[9]), parseFloat(splittedLine[10]), parseFloat(splittedLine[3]),
    parseFloat(splittedLine[11]), parseFloat(splittedLine[12]), parseFloat(splittedLine[13]), parseFloat(splittedLine[4]),
    0, 0, 0, 1
  );

  return new PartReference(splittedLine[splittedLine.length - 1], transform, parseInt(splittedLine[1]), invert);
}

//This function parses a line type two, which is a line
export function parseLineTypeTwo(line: string) {
  const splitLine = line.split(" ");
  if (splitLine.length < 8) {
    throw "line with too few coordinates";
  }

  return {
    color: parseInt(splitLine[1]),
    points: [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7]))
    ]
  }
}

//This function parses a line type three, which is a triangle
export function parseLineTypeThree(line: string, invert: boolean) {
  const splitLine = line.split(" ");
  if (splitLine.length < 10) {
    throw "Triangle with too few coordinates";
  }

  const color = parseInt(splitLine[1]);
  const vertices = [
    new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
    new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
    new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10]))
  ];
  const indices = invert ? [2, 1, 0] : [0, 1, 2];

  return {
    color: color,
    vertices: vertices,
    indices: indices
  };
}

//This function parses a line type four, which is a rectangle, but i just split those into two triangles
export function parseLineTypeFour(line: string, invert: boolean) {
  const splitLine = line.split(" ");
  if (splitLine.length < 13) {
    throw "Rectangle with too few coordinates";
  }
  const color = parseInt(splitLine[1]);
  let vertices: Vector3[];
  let indices: number[];
  vertices = [
    new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
    new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
    new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
    new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13]))
  ];
  indices = invert ? [2, 1, 0, 3, 2, 0] : [0, 1, 2, 0, 2, 3];
  return {
    color: color,
    vertices: vertices,
    indices: indices
  };
}

//Merges Vertices, but only if their colors fit together (i think)
export function mergeVertices(colorIndexMap: Map<number, number[]>, colorVertexMap: Map<number, Vector3[]>, colorLineVertexMap: Map<number, Vector3[]>) {
  for (let [color, indices] of colorIndexMap.entries()) {//for every color

    const vertices = colorVertexMap.get(color) ?? [];
    for (let face = 0; face < indices.length; face += 1) { //for every edge
      const face1index1index: number = face;
      const face1index2index: number = face + (face % 3 === 2 ? -2 : 1);
      const face1index1: number = indices[face1index1index];
      const face1index2: number = indices[face1index2index];
      const face1vertex1: Vector3 = vertices[face1index1];
      const face1vertex2: Vector3 = vertices[face1index2];

      //check if edge is a line
      let isLine = false;
      for (let lineVertices of colorLineVertexMap.values()) {
        if (!isLine)
          for (let lineVertex = 0; lineVertex < lineVertices.length; lineVertex += 2)
            if ((lineVertices[lineVertex].equals(face1vertex1) && lineVertices[lineVertex + 1].equals(face1vertex2)) ||
              (lineVertices[lineVertex].equals(face1vertex2) && lineVertices[lineVertex + 1].equals(face1vertex1))) {
              isLine = true;
              break;
            }
      }

      //if edge is not a line => find other face that uses this line => will need to be merged later
      if (!isLine) {
        //find 2nd faces edge
        let foundFace2index1: number = -1; // the index of the vertex equaling the vertex of another edge
        let foundFace2index2: number = -1;
        for (let face2 = face + 3 - (face % 3); face2 < indices.length; face2 += 1) { //for every faces edge starting from the next face
          const face2index1index: number = face2;
          const face2index2index: number = face2 + (face2 % 3 === 2 ? -2 : 1);
          const face2index1: number = indices[face2index1index];
          const face2index2: number = indices[face2index2index];
          const face2vertex1: Vector3 = vertices[face2index1];
          const face2vertex2: Vector3 = vertices[face2index2];
          if (face2vertex1.equals(face1vertex1) && face2vertex2.equals(face1vertex2) && !(face2index1 == face1index1 && face2index2 == face1index2)) { //if the vertices are the same (in values), the indices are not tho
            foundFace2index1 = face2index1;
            foundFace2index2 = face2index2;
            break;
          } else if (face2vertex1.equals(face1vertex2) && face2vertex2.equals(face1vertex1) && !(face2index1 == face1index2 && face2index2 == face1index1)) { //if the vertices are the same (in values), the indices are not tho
            foundFace2index1 = face2index2;
            foundFace2index2 = face2index1;
            break;
          }
        }

        if (foundFace2index1 !== -1 && foundFace2index2 !== -1) { //second face exists
          for (let index = 0; index < indices.length; index++) { //reroute all indices that also point to face1vertex1 to face2vertex1 (set them to face2index1)
            if (indices[index] === face1index1) { //TODO could maybe do index < face
              indices[index] = foundFace2index1;
            }
            if (indices[index] === face1index2) {
              indices[index] = foundFace2index2;
            }
          }
          indices[face1index1index] = foundFace2index1;
          indices[face1index2index] = foundFace2index2;
        }
      }
    }
    //TODO
    //remove all vertices that now are not being used anymore
    const removed: number[] = [];
    for (let vIndex: number = 0; vIndex < vertices.length; vIndex++) {
      const isUsed = indices.indexOf(vIndex);
      if (isUsed === -1) {
        for (let index = 0; index < indices.length; index++) {
          if (indices[index] > vIndex)
            indices[index]--;
        }
        vertices.splice(vIndex, 1);
        removed.push(vIndex);
      }
    }
  }
}


export function mergeLowAngleVertices(colorIndexMap: Map<number, number[]>, colorVertexMap: Map<number, Vector3[]>, angleThreshold: number) {
  for (let [color, indices] of colorIndexMap.entries()) {//for every color
    const vertices = colorVertexMap.get(color)!;

    const faceNormals: Map<number, Vector3> = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      faceNormals.set(i, new Triangle(vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]).getNormal(new Vector3()));
    }

    const faceAdjacencyMap: Map<number, number[]> = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
      const edges = [
        [Math.min(i0, i1), Math.max(i0, i1)],
        [Math.min(i1, i2), Math.max(i1, i2)],
        [Math.min(i2, i0), Math.max(i2, i0)],
      ];
      for (const [e0, e1] of edges) {
        if (!faceAdjacencyMap.has(i)) faceAdjacencyMap.set(i, []);
        for (let j = 0; j < indices.length; j++) {
          if (i === j) continue;
          const j0 = indices[j], j1 = indices[j + 1], j2 = indices[j + 2];
          const otherEdges = [
            [Math.min(j0, j1), Math.max(j0, j1)],
            [Math.min(j1, j2), Math.max(j1, j2)],
            [Math.min(j2, j0), Math.max(j2, j0)],
          ];
          if (otherEdges.some(([je0, je1]) => je0 === e0 && je1 === e1)) {
            faceAdjacencyMap.get(i)!.push(j);
          }
        }
      }
    }

    const vertexReplaceGroups: Map<number, number[]> = new Map();
    const visitedFaces = new Set<number>();
    for (let i = 0; i < indices.length; i += 3) {
      if (visitedFaces.has(i)) continue;
      const group: number[] = [i];
      visitedFaces.add(i);
      const queue: number[] = [i];

      while (queue.length > 0) {
        const faceId = queue.shift()!;
        for (const neighboringFaceId of faceAdjacencyMap.get(faceId)!) {
          if (visitedFaces.has(neighboringFaceId)) continue;
          const angle = faceNormals.get(faceId)!.angleTo(faceNormals.get(neighboringFaceId)!);
          if (angle <= angleThreshold) {
            group.push(neighboringFaceId);
            queue.push(neighboringFaceId);
            visitedFaces.add(neighboringFaceId);
          }
        }
      }

      const vertexIndices = new Set<number>();
      for (const faceIdx of group) {
        vertexIndices.add(indices[faceIdx]);
        vertexIndices.add(indices[faceIdx + 1]);
        vertexIndices.add(indices[faceIdx + 2]);
      }
      vertexIndices.forEach(idx => {
        if (!vertexReplaceGroups.has(idx)) vertexReplaceGroups.set(idx, []);
        vertexReplaceGroups.get(idx)!.push(...group);
      });
    }


    //replace indices
    const replaceVertices: Map<number, number> = new Map(); //which vertex index to be replaced with what other vertex index
    replaceVertices.forEach((replacement, deletion) => {
      for (let i = 0; i < indices.length; i += 1) {
        if (indices[i] === deletion) {
          indices[i] = replacement;
        }
      }
    });

    //do indices[i]-- to remove other vertices
    const unusedVertexIndices: number[] = [];
    for (let removeVertexIndex of unusedVertexIndices) {
      for (let i = 0; i < indices.length; i += 1) {
        if (indices[i] > removeVertexIndex)
          indices[i]--;
      }
    }

    //remove unused ones from vertices
    colorVertexMap.set(color,vertices.filter(v => unusedVertexIndices.findIndex(unusedVertexIndex => vertices[unusedVertexIndex] === v) === -1));
  }
}

export function resolvePart(partName: string, allPartsMap: Map<String, LdrPart>, options: {
  flatShading?: boolean
}): LdrPart {
  const ldrPart = allPartsMap.get(partName);
  if (ldrPart && !ldrPart.isResolved) {
    //resolve Part
    for (let i = 0; i < ldrPart.references.length; i++) {
      const partReference = ldrPart.references[i];

      const referencedPart = allPartsMap.get(partReference.name)
      if (referencedPart) {
        resolvePart(partReference.name, allPartsMap, options);

        const colorVertexIndexMap = new Map<number, Map<number, number>>(); //each colors indices of vertices will be different so they need to be mapped to the actual ones

        //for all colors and their vertices that the referenced part has
        referencedPart.colorVertexMap.forEach((vertices, color) => {
          const indexMap = new Map<number, number>();

          let actualPartColor = color; //a color can also be determined by above for a subPart, thats why this is to be checked here
          if (partReference.color !== 16 && partReference.color !== 24 && partReference.color !== -1 && partReference.color !== -2
            && (color === 16 || color === 24 || color === -1 || color === -2))
            actualPartColor = partReference.color;

          for (let i = 0; i < vertices.length; i++) { //transform each vertex and see if it already exists
            const transformedVertex = vertices[i].clone().applyMatrix4(partReference.transformMatrix);
            if (!ldrPart.colorVertexMap.has(actualPartColor)) { //color not found
              ldrPart.colorVertexMap.set(actualPartColor, [transformedVertex]);
              indexMap.set(i, i);
            }
            //part not in list already (if flat shading is disabled dont go into the else part)
            else if (!options.flatShading || !ldrPart.colorVertexMap.get(actualPartColor)?.find(v => v.equals(transformedVertex))) {
              const vertices = ldrPart.colorVertexMap.get(actualPartColor);
              if (vertices) {
                vertices.push(transformedVertex);
                indexMap.set(i, vertices.length - 1);
              } else throw "Part or Color not found during adding referenced parts vertices";
            } else //vertex has already been added of this color
              indexMap.set(i, ldrPart.colorVertexMap.get(actualPartColor)?.findIndex(v => v.equals(transformedVertex)) ?? -1);
          }
          colorVertexIndexMap.set(actualPartColor, indexMap);
        });

        //add all faces (made of indices of vertices)
        referencedPart.colorIndexMap.forEach((indices, color) => {
          const newIndices: number[] = []; // this will have the mapped indices

          let actualPartColor = color; //a color can also be determined by above for a subPart, thats why this is to be checked here
          if (partReference.color !== 16 && partReference.color !== 24 && partReference.color !== -1 && partReference.color !== -2
            && (color === 16 || color === 24 || color === -1 || color === -2))
            actualPartColor = partReference.color;

          for (let i = 0; i < indices.length; i++) {
            const mappedIndex = colorVertexIndexMap.get(actualPartColor)?.get(indices[i]);
            if (mappedIndex != null)
              newIndices.push(mappedIndex);
            else
              throw "Color or index not found during adding referenced parts indices";
          }

          //if to be inverted
          if (partReference.invert)
            newIndices.reverse();

          //add indices to map
          ldrPart?.colorIndexMap.set(actualPartColor, (ldrPart?.colorIndexMap.get(actualPartColor) ?? []).concat(newIndices));
        });

        referencedPart.colorLineVertexMap.forEach((vertices, referenceColor) => {
          const transformedPoints: Vector3[] = [];
          //transform points with transformation matrix of the reference to the part
          for (const vertex of vertices)
            transformedPoints.push(vertex.clone().applyMatrix4(partReference.transformMatrix));

          if (partReference.invert)
            transformedPoints.reverse();

          //append points of referenced part to the upper part to reduce the size of render hierachy
          if (ldrPart?.colorLineVertexMap.has(referenceColor)) {
            const fullList = ldrPart?.colorLineVertexMap.get(referenceColor)?.concat(transformedPoints)
            ldrPart?.colorLineVertexMap.set(referenceColor, fullList ? fullList : []);
          } else
            ldrPart?.colorLineVertexMap.set(referenceColor, transformedPoints);
        });
      }
    }

    ldrPart.isResolved = true;
    return ldrPart;
  } else {
    if (ldrPart)
      return ldrPart;
    throw ("Error: Part could not be found: " + partName);
  }
}

export function createBufferGeometry(partName: string, vertices: Vector3[], indices: number[], instructionVersion: string, flatShading: boolean): BufferGeometry {
  let partGeometry = new BufferGeometry();
  partGeometry.setFromPoints(vertices);
  partGeometry.setIndex(indices);

  //some parts need special attention...
  adjustGeometryByVersion(instructionVersion, partName, partGeometry);

  if (flatShading) partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);
  partGeometry.computeBoundingBox();
  partGeometry.computeVertexNormals();
  partGeometry.normalizeNormals();

  return partGeometry;
}

export function createLineGeometry(partName: string, vertices: Vector3[], instructionVersion: string, flatShading: boolean): BufferGeometry {
  let partGeometry = new BufferGeometry();
  partGeometry.setFromPoints(vertices);

  //some parts need special attention...
  adjustGeometryByVersion(instructionVersion, partName, partGeometry);

  if (flatShading) partGeometry = BufferGeometryUtils.mergeVertices(partGeometry, 0.1);

  return partGeometry;
}

export function bevelPart(ldrPart: LdrPart, bevelSize: number, bevelThreshold: number): void {
  for (let color in ldrPart.colorVertexMap.keys()) {
    //TODO
    const colorId = Number(color);
    const origVertices = ldrPart.colorVertexMap.get(colorId)!;
    const origFaces = ldrPart.colorIndexMap.get(colorId)!;

    //collect edges and vertices
    const edgeToVerticesFaces = new Map<string, [number, number, number[]]>(); // Kante -> [v1, v2, [faceIndices]]
    const faceToVerticesEdges = new Map<number, [number, number, number, string[]]>(); //Faceindex -> [v1,v2,v3,string[]]
    const vertexToEdges = new Map<number, string[]>(); // Vertex -> Liste von Kanten //TODO remove?
    for (let i = 0; i < origFaces.length; i += 3) {
      const face = [origFaces[i], origFaces[i + 1], origFaces[i + 2]];
      const edgesOfFace = [
        [face[0], face[1]],
        [face[1], face[2]],
        [face[2], face[0]],
      ];

      //Face-Edges/Vertices-Zuordnung
      faceToVerticesEdges.set(i, [origFaces[i], origFaces[i + 1], origFaces[i + 2],
        edgesOfFace.map(([v1, v2]) => v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`)]);

      //Edge-Face/Vertices-Zuordnung
      edgesOfFace.forEach(([v1, v2]) => {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (!edgeToVerticesFaces.has(key)) {
          edgeToVerticesFaces.set(key, [v1, v2, []]);
        }
        edgeToVerticesFaces.get(key)![2].push(i);
      });

      // Vertex-Kanten-Zuordnung
      face.forEach(v => {
        if (!vertexToEdges.has(v))
          vertexToEdges.set(v, []);
      });
      edgesOfFace.forEach(([v1, v2]) => {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (!vertexToEdges.get(v1)!.includes(key))
          vertexToEdges.get(v1)!.push(key);
        if (!vertexToEdges.get(v2)!.includes(key))
          vertexToEdges.get(v2)!.push(key);
      });
    }

    //find edges with angle > threshold
    //const bevelEdges: [number, number][] = [];
    const vertexToMovements = new Map<number, Map<string, Vector3[]>>(); //VertexIndex -> {edgeIndex,movements}[]
    //TODO make map with edge -> new vertices so that bevels can be added later
    for (const [edgeIndex, [v1, v2, faceIndices]] of edgeToVerticesFaces) {
      if (faceIndices.length === 2) {
        const faceA = [
          origVertices[origFaces[faceIndices[0]]],
          origVertices[origFaces[faceIndices[0] + 1]],
          origVertices[origFaces[faceIndices[0] + 2]],
        ];
        const faceB = [
          origVertices[origFaces[faceIndices[1]]],
          origVertices[origFaces[faceIndices[1] + 1]],
          origVertices[origFaces[faceIndices[1] + 2]],
        ];
        const angle = getAngleBetweenFaces(faceA, faceB);
        if (angle > bevelThreshold) {
          //calculate movement that vertices do away from the original position in order to get new position
          const faceAThirdVertex = origVertices[[origFaces[faceIndices[0]], origFaces[faceIndices[0] + 1], origFaces[faceIndices[0] + 2]].find(
            vertex => vertex !== v1 && vertex != v2)!];
          const faceBThirdVertex = origVertices[[origFaces[faceIndices[1]], origFaces[faceIndices[1] + 1], origFaces[faceIndices[1] + 2]].find(
            vertex => vertex !== v1 && vertex != v2)!];
          //where the edges point to
          const v1e1 = origVertices[v1].clone().sub(faceAThirdVertex)
          const v1e2 = origVertices[v1].clone().sub(faceBThirdVertex)
          const v2e1 = origVertices[v2].clone().sub(faceAThirdVertex)
          const v2e2 = origVertices[v2].clone().sub(faceBThirdVertex)

          const avgFaceVector = new Triangle(faceA[0], faceA[1], faceA[2]).getNormal(new Vector3()).normalize().add(new Triangle(faceA[0], faceA[1], faceA[2]).getNormal(new Vector3()).normalize()).normalize();

          //angles between mean vector of both faces and the edge
          const v1a1 = getAngleBetweenVectors(avgFaceVector, v1e1);
          const v1a2 = getAngleBetweenVectors(avgFaceVector, v1e2);
          const v2a1 = getAngleBetweenVectors(avgFaceVector, v2e1);
          const v2a2 = getAngleBetweenVectors(avgFaceVector, v2e2);

          const v1m1Length = (bevelSize / 2) / (Math.sin(v1a1));
          const v1m2Length = (bevelSize / 2) / (Math.sin(v1a2));
          const v1m1 = v1e1.setLength(v1m1Length);
          const v1m2 = v1e2.setLength(v1m2Length);

          const v2m1Length = (bevelSize / 2) / (Math.sin(v2a1));
          const v2m2Length = (bevelSize / 2) / (Math.sin(v2a2));
          const v2m1 = v2e1.setLength(v2m1Length);
          const v2m2 = v2e2.setLength(v2m2Length);

          const movement1 = [origVertices[v1].clone().add(v1m1), origVertices[v1].clone().add(v1m2)];
          if (vertexToMovements.has(v1)) {
            vertexToMovements.get(v1)!.set(edgeIndex, movement1);
          } else {
            const m = new Map<string, Vector3[]>();
            m.set(edgeIndex, movement1);
            vertexToMovements.set(v1, m);
          }
          const movement2 = [origVertices[v2].clone().add(v2m1), origVertices[v2].clone().add(v2m2)];
          if (vertexToMovements.has(v2)) {
            vertexToMovements.get(v2)!.set(edgeIndex, movement2);
          } else {
            const m = new Map<string, Vector3[]>();
            m.set(edgeIndex, movement2);
            vertexToMovements.set(v2, m);
          }
        } else {
          //add edge but without movement as the edge doesnt create a bevel
          if (vertexToMovements.has(v1)) {
            vertexToMovements.get(v1)!.set(edgeIndex, []);
          } else {
            const m = new Map<string, Vector3[]>();
            m.set(edgeIndex, []);
            vertexToMovements.set(v1, m);
          }
          if (vertexToMovements.has(v2)) {
            vertexToMovements.get(v2)!.set(edgeIndex, []);
          } else {
            const m = new Map<string, Vector3[]>();
            m.set(edgeIndex, []);
            vertexToMovements.set(v2, m);
          }
        }
      }
    }


    for (const [vertexIndex, edgeMovements] of vertexToMovements.entries()) {
      //find the edge that we start with
      const firstEdgeId = Array.from(edgeMovements.entries()).find(([e, m]) => m.length > 0)![0];
      //running variable
      const sortedEdges: { eId: string, fI: number }[] = [];

      let lastEdgeId = firstEdgeId;
      let lastFaceIndex = edgeToVerticesFaces.get(lastEdgeId)![2][1];

      do {
        sortedEdges.push({eId: firstEdgeId, fI: lastFaceIndex});
        const currentEdge = edgeToVerticesFaces.get(firstEdgeId)!;
        //take 2nd face
        const nextFaceIndex = lastFaceIndex == currentEdge[2][1] ? currentEdge[2][0] : currentEdge[2][1];
        //get 3rd vertex of 2nd face
        const nextFace = faceToVerticesEdges.get(nextFaceIndex)!; //TODO ! ok =?
        const thirdVertexOfFace = [nextFace[0], nextFace[1], nextFace[2]].find(v => v != currentEdge[0] && v != currentEdge[1])!; //TODO ! ok ?
        //next edge = (vertex -> 3rd vertex) edge
        lastEdgeId = vertexIndex < thirdVertexOfFace ? `${vertexIndex}-${thirdVertexOfFace}` : `${thirdVertexOfFace}-${vertexIndex}`;
        lastFaceIndex = edgeToVerticesFaces.get(lastEdgeId)![2][1] === lastFaceIndex ? edgeToVerticesFaces.get(lastEdgeId)![2][0] : edgeToVerticesFaces.get(lastEdgeId)![2][1];

      } while (lastEdgeId != firstEdgeId)


      //count edges with bevels
      const bevelAmount = Array.from(edgeMovements.entries()).filter(([e, m]) => m.length > 0)!.length;
      if (bevelAmount > 1) {

        const firstMovement = edgeMovements.get(sortedEdges[0].eId)!;
        for (let edge of sortedEdges) {
          if (edgeMovements.get(edge.eId)!.length > 0) {
            //TODO
          }
        }
        //TODO for each between bevels -> average the vertex position
        //TODO collect faces for each between
        //TODO create vertex
        //TODO set all faces to have that vertex
        //TODO delete old vertex -> instead use this as one if the upper ones
      } else if (bevelAmount === 1) {
        //TODO create vertices
        //TODO idk get avg vector or so and cut the edges of somehow
        //TODO delete old vertex -> instead use this as one if the upper ones
      }
    }

    //TODO add bevel for each edge based on edge -> ... map

  }
}

function getAngleBetweenFaces(faceA: Vector3[], faceB: Vector3[]): number {
  const normalA = new Triangle(faceA[0], faceA[1], faceA[2]).getNormal(new Vector3()).normalize();
  const normalB = new Triangle(faceB[0], faceB[1], faceB[2]).getNormal(new Vector3()).normalize();
  const dot = normalA.dot(normalB);
  return MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, dot))));
}

function getAngleBetweenVectors(v1: Vector3, v2: Vector3): number {
  const dot = v1.dot(v2);
  return MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, dot))));
}

export function shrinkPartScale(ldrPart: LdrPart, gapSize: number): void {
  let maxX = -10000, maxY = -10000, maxZ = -10000, minX = 10000, minY = 10000, minZ = 10000;
  ldrPart.colorVertexMap.forEach(vertices =>
    vertices.forEach(vertex => {
      if (vertex.x > maxX) {
        maxX = vertex.x;
      } else if (vertex.x < minX) {
        minX = vertex.x;
      }
      if (vertex.y > maxY) {
        maxY = vertex.y;
      } else if (vertex.y < minY) {
        minY = vertex.y;
      }
      if (vertex.z > maxZ) {
        maxZ = vertex.z;
      } else if (vertex.z < minZ) {
        minZ = vertex.z;
      }
    })
  );
  console.log("vertices", ldrPart.colorVertexMap);
  console.log("faces", ldrPart.colorIndexMap);
  const neededX = maxX - minX - 2 * gapSize, neededY = maxY - minY - 2 * gapSize, neededZ = maxZ - minZ - 2 * gapSize;
  const currentX = maxX - minX, currentY = maxY - minY, currentZ = maxZ - minZ;

  const scaleX = neededX / currentX, scaleY = neededY / currentY, scaleZ = neededZ / currentZ;

  ldrPart.colorVertexMap.forEach(vertices => vertices.forEach(vertex => {
    vertex.x = vertex.x * scaleX;
    vertex.y = vertex.y * scaleY;
    vertex.z = vertex.z * scaleZ;
  }));
}
