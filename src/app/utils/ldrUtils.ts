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
export function parseLineTypeFour(line: string, invert: boolean, merge: boolean) {
  const splitLine = line.split(" ");
  if (splitLine.length < 13) {
    throw "Rectangle with too few coordinates";
  }


  const color = parseInt(splitLine[1]);
  let vertices: Vector3[];
  let indices: number[];
  if (merge) {
    vertices = [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13]))
    ];
    indices = invert ? [2, 1, 0, 3, 2, 0] : [0, 1, 2, 0, 2, 3];
  } else {
    vertices = [
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[5]), parseFloat(splitLine[6]), parseFloat(splitLine[7])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[2]), parseFloat(splitLine[3]), parseFloat(splitLine[4])),
      new Vector3(parseFloat(splitLine[8]), parseFloat(splitLine[9]), parseFloat(splitLine[10])),
      new Vector3(parseFloat(splitLine[11]), parseFloat(splitLine[12]), parseFloat(splitLine[13]))
    ];
    indices = invert ? [2, 1, 0, 5, 4, 3] : [0, 1, 2, 3, 4, 5];
  }
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
    const edges: Map<string, [number, number, number[]]> = new Map(); // Kante -> [v1, v2, [faceIndices]]
    const vertexEdges: Map<number, [number, number][]> = new Map(); // Vertex -> Liste von Kanten //TODO remove?
    for (let i = 0; i < origFaces.length; i += 3) {
      const face = [origFaces[i], origFaces[i + 1], origFaces[i + 2]];
      const edgesOfFace = [
        [face[0], face[1]],
        [face[1], face[2]],
        [face[2], face[0]],
      ];

      edgesOfFace.forEach(([v1, v2]) => {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (!edges.has(key)) {
          edges.set(key, [v1, v2, []]);
        }
        edges.get(key)![2].push(i);
      });

      // Vertex-Kanten-Zuordnung
      face.forEach(v => {
        if (!vertexEdges.has(v)) vertexEdges.set(v, []);
      });
      edgesOfFace.forEach(([v1, v2]) => {
        vertexEdges.get(v1)!.push([v1, v2]);
        vertexEdges.get(v2)!.push([v1, v2]);
      });
    }

    //find edges with angle > threshold
    //const bevelEdges: [number, number][] = [];
    const vertexMovements = new Map<number, [{ e: string, m1: Vector3, m2: Vector3 }]>(); //VertexIndex -> {edgeIndex,movement1,movement2}[]
    for (const [, [v1, v2, faceIndices]] of edges) {
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
          vertexMovements
          //bevelEdges.push([v1, v2]);
          //füge vertexMovements v1 und v2 hinzu
        }
      }
    }

    //for each vertex -> if in vertexMovements
    //create new vertices
    //create new top face(s) if needed
    //save new vertices in edge map: edge -> {newV1:vertex[],newV2:vertex[]}

    //for edge in edge map
    //create bevel face for all edges in there

    /*
    const colorId = Number(color);
    const origVertices = ldrPart.colorVertexMap.get(colorId)!;
    const updatedVertices = origVertices.map(vertex => vertex.clone());
    const origIndices = ldrPart.colorIndexMap.get(colorId)!;
    const updatedIndices = [...origIndices];
    //origVertexIndex -> updatedVertexIndex, will be used for the platforms
    const updatedVertexMap = new Map<number, number[]>();
    //for original edge points (all edges) -> save new indices of points used on both sides of the edge, will be used for bevels
    const updatedEdgesMap = new Map<number[], number[][]>();

    for (let indicesIndex = 0; indicesIndex < origIndices.length; indicesIndex += 3) {
      const edge1 = [indicesIndex, indicesIndex + 1];
      const edge2 = [indicesIndex + 1, indicesIndex + 2];
      const edge3 = [indicesIndex + 2, indicesIndex];

      const adjacentFace1FirstIndex = findAdjacentFace(origIndices, edge1, indicesIndex);
      const adjacentFace2FirstIndex = findAdjacentFace(origIndices, edge2, indicesIndex);
      const adjacentFace3FirstIndex = findAdjacentFace(origIndices, edge3, indicesIndex);

      const currentFaceNormal = new Triangle(origVertices[indicesIndex], origVertices[indicesIndex + 1], origVertices[indicesIndex + 2]).getNormal(new Vector3(0, 0, 0));
      const adjacentFace1Normal = new Triangle(origVertices[adjacentFace1FirstIndex], origVertices[adjacentFace1FirstIndex + 1], origVertices[adjacentFace1FirstIndex + 2]).getNormal(new Vector3(0, 0, 0));
      const adjacentFace2Normal = new Triangle(origVertices[adjacentFace2FirstIndex], origVertices[adjacentFace2FirstIndex + 1], origVertices[adjacentFace2FirstIndex + 2]).getNormal(new Vector3(0, 0, 0));
      const adjacentFace3Normal = new Triangle(origVertices[adjacentFace3FirstIndex], origVertices[adjacentFace3FirstIndex + 1], origVertices[adjacentFace3FirstIndex + 2]).getNormal(new Vector3(0, 0, 0));

      const edgeAngle1 = MathUtils.radToDeg(currentFaceNormal.angleTo(adjacentFace1Normal));
      const edgeAngle2 = MathUtils.radToDeg(currentFaceNormal.angleTo(adjacentFace2Normal));
      const edgeAngle3 = MathUtils.radToDeg(currentFaceNormal.angleTo(adjacentFace3Normal));

      const moveVertex1By = new Vector3(0, 0, 0);
      const moveVertex2By = new Vector3(0, 0, 0);
      const moveVertex3By = new Vector3(0, 0, 0);

      if (edgeAngle1 >= bevelThreshold) {
        const adjacentLineVector1 = origVertices[indicesIndex + 2].clone().sub(origVertices[indicesIndex]);
        const angleOnVertex1 = origVertices[indicesIndex + 1].clone().sub(origVertices[indicesIndex]).angleTo(adjacentLineVector1);
        let moveByLengthOnVector1 = Math.sin(angleOnVertex1) * bevelSize / 2;
        if (adjacentLineVector1.length() < moveByLengthOnVector1) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector1 = adjacentLineVector1.length();
        }
        adjacentLineVector1.setLength(moveByLengthOnVector1);

        const adjacentLineVector2 = origVertices[indicesIndex + 2].clone().sub(origVertices[indicesIndex + 1]);
        const angleOnVertex2 = origVertices[indicesIndex].clone().sub(origVertices[indicesIndex + 1]).angleTo(adjacentLineVector2);
        let moveByLengthOnVector2 = Math.sin(angleOnVertex2) * bevelSize / 2;
        if (adjacentLineVector2.length() < moveByLengthOnVector2) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector2 = adjacentLineVector2.length();
        }
        adjacentLineVector2.setLength(moveByLengthOnVector2);

        moveVertex1By.add(adjacentLineVector1);
        moveVertex2By.add(adjacentLineVector2);
      }
      if (edgeAngle2 >= bevelThreshold) {
        const adjacentLineVector1 = origVertices[indicesIndex].clone().sub(origVertices[indicesIndex + 1]);
        const angleOnVertex1 = origVertices[indicesIndex + 2].clone().sub(origVertices[indicesIndex + 1]).angleTo(adjacentLineVector1);
        let moveByLengthOnVector1 = Math.sin(angleOnVertex1) * bevelSize / 2;
        if (adjacentLineVector1.length() < moveByLengthOnVector1) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector1 = adjacentLineVector1.length();
        }
        adjacentLineVector1.setLength(moveByLengthOnVector1);

        const adjacentLineVector2 = origVertices[indicesIndex].clone().sub(origVertices[indicesIndex + 2]);
        const angleOnVertex2 = origVertices[indicesIndex + 1].clone().sub(origVertices[indicesIndex + 2]).angleTo(adjacentLineVector2);
        let moveByLengthOnVector2 = Math.sin(angleOnVertex2) * bevelSize / 2;
        if (adjacentLineVector2.length() < moveByLengthOnVector2) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector2 = adjacentLineVector2.length();
        }
        adjacentLineVector2.setLength(moveByLengthOnVector2);

        moveVertex2By.add(adjacentLineVector1);
        moveVertex3By.add(adjacentLineVector2);
      }
      if (edgeAngle3 >= bevelThreshold) {
        const adjacentLineVector1 = origVertices[indicesIndex + 1].clone().sub(origVertices[indicesIndex + 2]);
        const angleOnVertex1 = origVertices[indicesIndex].clone().sub(origVertices[indicesIndex + 2]).angleTo(adjacentLineVector1);
        let moveByLengthOnVector1 = Math.sin(angleOnVertex1) * bevelSize / 2;
        if (adjacentLineVector1.length() < moveByLengthOnVector1) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector1 = adjacentLineVector1.length();
        }
        adjacentLineVector1.setLength(moveByLengthOnVector1);

        const adjacentLineVector2 = origVertices[indicesIndex + 1].clone().sub(origVertices[indicesIndex]);
        const angleOnVertex2 = origVertices[indicesIndex + 2].clone().sub(origVertices[indicesIndex]).angleTo(adjacentLineVector2);
        let moveByLengthOnVector2 = Math.sin(angleOnVertex2) * bevelSize / 2;
        if (adjacentLineVector2.length() < moveByLengthOnVector2) {
          console.warn("bevel is destroying face");
          moveByLengthOnVector2 = adjacentLineVector2.length();
        }
        adjacentLineVector2.setLength(moveByLengthOnVector2);

        moveVertex3By.add(adjacentLineVector1);
        moveVertex1By.add(adjacentLineVector2);
      }

      if (moveVertex1By.length() !== 0) {
        const indexOfNewVertex = updatedVertices.push(origVertices[indicesIndex].clone().add(moveVertex1By)) - 1;
        updatedIndices[indicesIndex] = indexOfNewVertex;
        if (updatedVertexMap.has(indicesIndex))
          updatedVertexMap.get(indicesIndex)?.push(indexOfNewVertex);
        else
          updatedVertexMap.set(indicesIndex, [indexOfNewVertex]);

        //update adjacent not changing faces vertices
        if (edgeAngle1 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace1FirstIndex] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace1FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace1FirstIndex + 1] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace1FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace1FirstIndex + 2] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace1FirstIndex + 2] = indexOfNewVertex;
          }
        }
        if (edgeAngle3 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace3FirstIndex] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace3FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace3FirstIndex + 1] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace3FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace3FirstIndex + 2] === origIndices[indicesIndex]) {
            updatedIndices[adjacentFace3FirstIndex + 2] = indexOfNewVertex;
          }
        }

      }
      if (moveVertex2By.length() !== 0) {
        const indexOfNewVertex = updatedVertices.push(origVertices[indicesIndex + 1].clone().add(moveVertex2By)) - 1;
        updatedIndices[indicesIndex + 1] = indexOfNewVertex;
        if (updatedVertexMap.has(indicesIndex + 1))
          updatedVertexMap.get(indicesIndex + 1)?.push(indexOfNewVertex);
        else
          updatedVertexMap.set(indicesIndex + 1, [indexOfNewVertex]);

        //update adjacent not changing faces vertices
        if (edgeAngle1 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace1FirstIndex] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace1FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace1FirstIndex + 1] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace1FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace1FirstIndex + 2] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace1FirstIndex + 2] = indexOfNewVertex;
          }
        }
        if (edgeAngle2 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace2FirstIndex] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace2FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace2FirstIndex + 1] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace2FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace2FirstIndex + 2] === origIndices[indicesIndex + 1]) {
            updatedIndices[adjacentFace2FirstIndex + 2] = indexOfNewVertex;
          }
        }
      }
      if (moveVertex3By.length() !== 0) {
        const indexOfNewVertex = updatedVertices.push(origVertices[indicesIndex + 2].clone().add(moveVertex3By)) - 1;
        updatedIndices[indicesIndex + 2] = indexOfNewVertex;
        if (updatedVertexMap.has(indicesIndex + 2))
          updatedVertexMap.get(indicesIndex + 2)?.push(indexOfNewVertex);
        else
          updatedVertexMap.set(indicesIndex + 2, [indexOfNewVertex]);

        //update adjacent not changing faces vertices
        if (edgeAngle3 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace3FirstIndex] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace3FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace3FirstIndex + 1] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace3FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace3FirstIndex + 2] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace3FirstIndex + 2] = indexOfNewVertex;
          }
        }
        if (edgeAngle2 < bevelThreshold) {
          //find vertex that fits this moved one
          if (origIndices[adjacentFace2FirstIndex] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace2FirstIndex] = indexOfNewVertex;
          } else if (origIndices[adjacentFace2FirstIndex + 1] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace2FirstIndex + 1] = indexOfNewVertex;
          } else if (origIndices[adjacentFace2FirstIndex + 2] === origIndices[indicesIndex + 2]) {
            updatedIndices[adjacentFace2FirstIndex + 2] = indexOfNewVertex;
          }
        }
      }
    }
*/
    //TODO create new platforms from updatesVertexMap

    //TODO create bevel faces
  }
  //TODO remove unused vertices

  //TODO collect all edges that will be beveled and all that onwt
}

function getAngleBetweenFaces(faceA: Vector3[], faceB: Vector3[]): number {
  const normalA = new Triangle(faceA[0], faceA[1], faceA[2]).getNormal(new Vector3()).normalize();
  const normalB = new Triangle(faceB[0], faceB[1], faceB[2]).getNormal(new Vector3()).normalize();
  const dot = normalA.dot(normalB);
  return MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, dot))));
}


function findAdjacentFace(origIndices: number[], vertices: number[], excludeIndex: number): number {
  for (let indicesIndex = 0; indicesIndex < origIndices.length; indicesIndex += 3) {
    if (indicesIndex !== excludeIndex
      && ((origIndices[indicesIndex] === vertices[0] && origIndices[indicesIndex + 1] === vertices[1]) || (origIndices[indicesIndex] === vertices[1] && origIndices[indicesIndex + 1] === vertices[0]))
      && ((origIndices[indicesIndex + 1] === vertices[0] && origIndices[indicesIndex + 2] === vertices[1]) || (origIndices[indicesIndex + 1] === vertices[1] && origIndices[indicesIndex + 2] === vertices[0]))
      && ((origIndices[indicesIndex + 2] === vertices[0] && origIndices[indicesIndex] === vertices[1]) || (origIndices[indicesIndex + 2] === vertices[1] && origIndices[indicesIndex] === vertices[0]))) {
      return indicesIndex;
    }
  }
  return -1;
}

//todo add flat shading stuff
export function shrinkPart(ldrPart: LdrPart, gapSize: number, flatShading: boolean): void {
  //TODO remove
  gapSize = 0.5;
  const minAllowedError = 0.999;
  const disconnectedFaceDistanceThreshold = 0.001;
  ldrPart.colorVertexMap.forEach((origVertices, color) => {
    const colorId = Number(color);
    const indices = ldrPart.colorIndexMap.get(colorId)!;
    console.log(JSON.parse(JSON.stringify(origVertices)))
    console.log(JSON.parse(JSON.stringify(indices)))

    //collect vertex -> faces map
    const vertexConnectionsMap = new Map<number, number[]>();
    for (let faceIndex = 0; faceIndex < indices.length; faceIndex += 3) {
      if (vertexConnectionsMap.has(indices[faceIndex]))
        vertexConnectionsMap.get(indices[faceIndex])?.push(faceIndex);
      else
        vertexConnectionsMap.set(indices[faceIndex], [faceIndex]);

      if (vertexConnectionsMap.has(indices[faceIndex + 1]))
        vertexConnectionsMap.get(indices[faceIndex + 1])?.push(faceIndex);
      else
        vertexConnectionsMap.set(indices[faceIndex + 1], [faceIndex]);

      if (vertexConnectionsMap.has(indices[faceIndex + 2]))
        vertexConnectionsMap.get(indices[faceIndex + 2])?.push(faceIndex);
      else
        vertexConnectionsMap.set(indices[faceIndex + 2], [faceIndex]);
    }


    const cornerUpdatedVertices = origVertices.map(v => v.clone());
    //move vertices based on connected faces
    vertexConnectionsMap.forEach((faceIndices, vertexIndex) => {
      //create planes that represent the moved face triangles
      const updatedFacePlanes: Plane[] = [];
      for (let faceIndex of faceIndices) {
        //calculate where the plane of the adjusted face would be
        const v1 = origVertices[indices[faceIndex]];
        const v2 = origVertices[indices[faceIndex + 1]];
        const v3 = origVertices[indices[faceIndex + 2]];
        const currentFaceNormal = new Plane().setFromCoplanarPoints(v1, v2, v3).normal.clone().normalize();
        currentFaceNormal.setLength(gapSize);
        const adjustedPlane: Plane = new Plane().setFromCoplanarPoints(v1.clone().sub(currentFaceNormal), v2.clone().sub(currentFaceNormal), v3.clone().sub(currentFaceNormal));

        //save plane if other plane with same normal vector not already saved (allow tiny error due to floating point)
        if (updatedFacePlanes.filter(p => p.normal.clone().normalize().dot(adjustedPlane.normal.clone().normalize()) > minAllowedError).length === 0) {
          updatedFacePlanes.push(adjustedPlane);
        }
      }

      //adjust vertices based on the faces it is part of
      let newVertexPosition: Vector3;
      if (updatedFacePlanes.length === 1) { // vertex is only connected to one plane -> move along the normal vector of the plane
        const normal = updatedFacePlanes[0].normal.clone().normalize();
        normal.setLength(gapSize);
        newVertexPosition = cornerUpdatedVertices[vertexIndex].sub(normal);
      } else if (updatedFacePlanes.length === 2) { // vertex is connected to two planes -> move on avg face normal //TODO remove clone?
        const avgNormal: Vector3 = updatedFacePlanes[0].normal.clone().normalize().add(updatedFacePlanes[1].normal.clone().normalize()).divideScalar(2);
        const moveLength = gapSize / Math.sin(0.5 * Math.PI - updatedFacePlanes[0].normal.angleTo(avgNormal));
        avgNormal.setLength(moveLength);
        newVertexPosition = cornerUpdatedVertices[vertexIndex].sub(avgNormal);
      } else { //must be more than 2 faces
        //taking 3 of the planes (no more than that needed); their intersection point creates the new vertex
        newVertexPosition = planesIntersectionPoint(updatedFacePlanes[0], updatedFacePlanes[1], updatedFacePlanes[2]);
      }
      //update vertex position
      cornerUpdatedVertices[vertexIndex] = newVertexPosition;
    });

    const finalVertices = cornerUpdatedVertices.map(v => v.clone());
    //TODO should actually be done no matter the color i think, but oh well -> and needs an extra saving of the updatedvertices for that
    //TODO should be a difference between this point being on a face and being on another point, but not being the same (can happen if multiple colors)
    //TODO in that case it needs to be move as the other point there is being moved as well
    //move vertices based on not connected but overlapping faces
    //TODO only up to 1 face tbh

    for (let i = 0; i < origVertices.length; i++) {
      console.log("vertexIndex", i);
      const vertex = origVertices[i];
      const cornerUpdatedVertex = cornerUpdatedVertices[i];

      //collect all faces this vertex is inside but not a corner point of
      const affectedFaceIndices = [];
      //loop over all faces -> if vertex inside face, but is not a corner point, save that face in list
      for (let faceIndex = 0; faceIndex < indices.length; faceIndex += 3) {
        const triangle = new Triangle(origVertices[indices[faceIndex]], origVertices[indices[faceIndex + 1]], origVertices[indices[faceIndex + 2]]);
        if (triangle.containsPoint(vertex)
          && Math.abs(triangle.getPlane(new Plane()).distanceToPoint(vertex)) < disconnectedFaceDistanceThreshold
          && !vertex.equals(origVertices[indices[faceIndex]]) && !vertex.equals(origVertices[indices[faceIndex + 1]]) && !vertex.equals(origVertices[indices[faceIndex + 2]])) {
          affectedFaceIndices.push(faceIndex);
          //console.log(JSON.parse(JSON.stringify(vertex)),JSON.parse(JSON.stringify([origVertices[indices[faceIndex]], origVertices[indices[faceIndex + 1]], origVertices[indices[faceIndex + 2]]])));
        }
      }

      console.log("affected face indices", affectedFaceIndices);
      //for each of those faces, adjust the point, should only be one face max for a vertex
      //TODO group faces by normalvectors
      affectedFaceIndices.forEach(faceIndex => {
        const facePlane: Plane = new Plane().setFromCoplanarPoints(origVertices[indices[faceIndex]], origVertices[indices[faceIndex + 1]], origVertices[indices[faceIndex + 2]]);
        const faceNormalMovedFaceNormal: Vector3 = facePlane.normal.clone().setLength(gapSize);
        const movedV1 = origVertices[indices[faceIndex]].clone().sub(faceNormalMovedFaceNormal),
          movedV2 = origVertices[indices[faceIndex + 1]].clone().sub(faceNormalMovedFaceNormal),
          movedV3 = origVertices[indices[faceIndex + 2]].clone().sub(faceNormalMovedFaceNormal);
        const adjustedFacePlane: Plane = new Plane().setFromCoplanarPoints(movedV1, movedV2, movedV3);
        const distanceToAdjustedFace: number = adjustedFacePlane.distanceToPoint(cornerUpdatedVertex);
        console.log("distance to adjusted face", distanceToAdjustedFace);
        if (Math.abs(distanceToAdjustedFace) > disconnectedFaceDistanceThreshold) {
          console.log("adjusting vector", JSON.parse(JSON.stringify(facePlane.normal.clone().setLength(distanceToAdjustedFace))));
          finalVertices[i] = finalVertices[i].sub(facePlane.normal.clone().setLength(distanceToAdjustedFace));
        }
      });
    }

    ldrPart.colorVertexMap.set(color, finalVertices);
  });
}

function planesIntersectionPoint(p1: Plane, p2: Plane, p3: Plane): Vector3 {
  let n1 = p1.normal, n2 = p2.normal, n3 = p3.normal;
  let f1 = new Vector3().crossVectors(n2, n3).multiplyScalar(p1.coplanarPoint(new Vector3()).dot(n1));
  let f2 = new Vector3().crossVectors(n3, n1).multiplyScalar(p2.coplanarPoint(new Vector3()).dot(n2));
  let f3 = new Vector3().crossVectors(n1, n2).multiplyScalar(p3.coplanarPoint(new Vector3()).dot(n3));
  let det = new Matrix3().set(n1.x, n1.y, n1.z, n2.x, n2.y, n2.z, n3.x, n3.y, n3.z).determinant();
  let vectorSum = new Vector3().add(f1).add(f2).add(f3);
  return new Vector3(vectorSum.x / det, vectorSum.y / det, vectorSum.z / det);
}

export function shrinkPartScale(ldrPart: LdrPart, gapSize: number): void {
  let maxX = -10000, maxY = -10000, maxZ = -10000, minX = 10000, minY = 10000, minZ = 10000;
  ldrPart.colorVertexMap.forEach(vertices => vertices.forEach(vertex => {
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
  }));
  const neededX = maxX - minX - 2 * gapSize, neededY = maxY - minY - 2 * gapSize, neededZ = maxZ - minZ - 2 * gapSize;
  const currentX = maxX - minX, currentY = maxY - minY, currentZ = maxZ - minZ;

  const scaleX = neededX / currentX, scaleY = neededY / currentY, scaleZ = neededZ / currentZ;

  ldrPart.colorVertexMap.forEach(vertices => vertices.forEach(vertex => {
    vertex.x = vertex.x * scaleX;
    vertex.y = vertex.y * scaleY;
    vertex.z = vertex.z * scaleZ;
  }));
}
