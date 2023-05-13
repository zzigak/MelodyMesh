import * as THREE from 'three';
import { Face } from './libs/ConvexHull.js'; // TODO after r145 import from three instead

/**
 * Doubly Connected Edge List - DCEL
 * For each face in the geometry, contains its half-edges.
 * A half-edge has two vertices and its twin half-edge on the adjacent face.
 */

export class Dcel {
    constructor(geometry, options) {
        this.vertices = Array.from({ length: geometry.attributes.position.count }, (_, i) => {
            return {
                point: new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i),
                index: i,
                halfEdge: null
            };
        });

        const threshold = !options ? 1e-4 : options.mergeVerticesThreshold;
        if (threshold) {
            const hashToVertex = {}
            this.vertices.forEach(v => {
                v.origIndex = v.index;
                const hash = `${~~(v.point.x / threshold)},${~~(v.point.y / threshold)},${~~(v.point.z / threshold)}`;
                if (hash in hashToVertex) {
                    v.index = hashToVertex[hash];
                } else {
                    hashToVertex[hash] = v.index;
                }
            });
        }

        const faceIndices = new THREE.Vector3();
        this.faces = Array.from({ length: geometry.index.count / 3 }, (_, i) => {
            faceIndices.fromArray(geometry.index.array, i * 3);
            const face = Face.create(this.vertices[faceIndices.x], this.vertices[faceIndices.y], this.vertices[faceIndices.z]);
            face.index = i;
            return face;
        });

        const hashToEdge = {};
        this.faces.forEach(face => {
            this.forEdges(face, e => {
                if(!e.twin) {
                    const hashInv = `${e.tail().index},${e.head().index}`;
                    if (hashInv in hashToEdge) {
                        e.setTwin(hashToEdge[hashInv]);
                    } else {
                        const hash = `${e.head().index},${e.tail().index}`;
                        hashToEdge[hash] = e;
                    }
                }
                
                // TODO(NHAN): make half edge reference for vertex
                // Give each vertex a single half-edge reference
                // If twin exist, sets twin's half-edge as well
                if (!this.vertices[e.head().index].halfEdge) {
                    this.vertices[e.head().index].halfEdge = e;
                    if (e.twin) {
                        this.vertices[e.twin.head().index].halfEdge = e.twin;
                    }
                }
                
            });
        });
    }

    forEdges(face, callback) {
        const start = face.edge;
        let e = start;
        while (true) {
            callback(e, face, this);
            e = e.next;
            if (e === start) {
                break;
            }
        }
    }

    forAdjacentFaces(faceIndex, callback) {
        this.forEdges(this.faces[faceIndex], e => {
            callback(e.twin.face.index);
        });
    }

    outgoingHalfEdgesOnVertex(v) {
        const outHalfedges = [];
        let first = v.halfEdge;
        let he = v.halfEdge;

        while (true) {
            if (outHalfedges.includes(he)) break;
            outHalfedges.push(he);

            he = he.twin.next;
            if (first == he) break;
        }
        return outHalfedges;
    }
    
    // Return one-ring neighbors of input vertex, not including input vertex itself
    verticesOnVertex(v) {
        const vertices = [];

        const outgoingHalfEdges = this.outgoingHalfEdgesOnVertex(v);
        for (let he of outgoingHalfEdges) {
            vertices.push(he.head());
        }
        return vertices;
    }

    // Return neighbor Faces associated with the one-ring neighbors of input vertex
    oneRingFacesOnVertex(v) {
        const neighborFaces = [];

        const outgoingHalfEdges = this.outgoingHalfEdgesOnVertex(v);

        outgoingHalfEdges.forEach(he => {
            neighborFaces.push(he.face);
        });
        return neighborFaces
    }

    // Return neighbor Faces associated with the N-th ring neighbors of input vertex
    nNeighborFacesOnVertex(vertex, n) { 
    let neighbors = [];
    let currentFace = this.oneRingFacesOnVertex(vertex)[0];   
    let nextRing = [];
    
    for (let i = 0; i < n; i++) {
        let faces = this.oneRingFacesOnVertex(currentFace.edge.vertex);
        for (let f of faces) {   
            if (!neighbors.includes(f)) {
                neighbors.push(f);
                nextRing.push(f);  
            }
        }
        currentFace = nextRing.pop();      
    }
    
    return neighbors;
    } 
}

