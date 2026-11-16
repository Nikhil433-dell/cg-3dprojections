import * as CG from './transforms.js';
import { Matrix, Vector } from "./matrix.js";

const LEFT =   32; // binary 100000
const RIGHT =  16; // binary 010000
const BOTTOM = 8;  // binary 001000
const TOP =    4;  // binary 000100
const FAR =    2;  // binary 000010
const NEAR =   1;  // binary 000001
const FLOAT_EPSILON = 0.000001;

class Renderer {
    // canvas:              object ({id: __, width: __, height: __})
    // scene:               object (...see description on Canvas)
    constructor(canvas, scene) {
        this.canvas = document.getElementById(canvas.id);
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
        this.ctx = this.canvas.getContext('2d');
        this.scene = this.processScene(scene);
        this.enable_animation = true;  // <-- disabled for easier debugging; enable for animation
        this.start_time = null;
        this.prev_time = null;
    }

    //
    updateTransforms(time, delta_time) {
        // TODO: update any transformations needed for animation

        const seconds = time / 1000;

        for (const model of this.scene.models) {
            
            if (!model.animation) {
                continue;
            }

            // center for the Generated shapes
            let center = model.center;
            
            if (!center) {
                if (!model.vertices || model.vertices.length === 0) {
                    continue;
                }

                if (!model.rotationCenter) {
                    let minX = Infinity, minY = Infinity, minZ = Infinity;
                    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

                    for (const vertex of model.vertices) {
                        minX = Math.min(minX, vertex.x);
                        minY = Math.min(minY, vertex.y);
                        minZ = Math.min(minZ, vertex.z);

                        maxX = Math.max(maxX, vertex.x);
                        maxY = Math.max(maxY, vertex.y);
                        maxZ = Math.max(maxZ, vertex.z);
                    }

                    model.rotationCenter = CG.Vector3(
                        (minX + maxX) / 2,
                        (minY + maxY) / 2,
                        (minZ + maxZ) / 2
                    );
                }

                center = model.rotationCenter;
            }

            const angle = 2 * Math.PI * model.animation.rps * seconds;

            const rotation = new Matrix(4, 4);

            if (model.animation.axis === "x") {
                CG.mat4x4RotateX(rotation, angle);
            } else if (model.animation.axis === "y") {
                CG.mat4x4RotateY(rotation, angle);
            } else if (model.animation.axis === "z") {
                CG.mat4x4RotateZ(rotation, angle);
            } else {
                continue;
            }

            const toOrigin = new Matrix(4, 4);
            CG.mat4x4Translate(
                toOrigin,
                -center.x,
                -center.y,
                -center.z
            );

            const moveBack = new Matrix(4, 4);
            CG.mat4x4Translate(
                moveBack,
                center.x,
                center.y,
                center.z
            );

            model.matrix = Matrix.multiply([
                moveBack,
                rotation,
                toOrigin
            ]);
        }

    }

    // Rotate the viewing direction about the camera's v-axis
    rotateCamera(theta) {
        const view = this.scene.view;
        const n = view.prp.subtract(view.srp);
        n.normalize();
        const u = view.vup.cross(n);
        u.normalize();
        const v = n.cross(u);
        v.normalize();

        const direction = view.srp.subtract(view.prp);
        const cross = v.cross(direction);
        const dot = v.dot(direction);
        const c = Math.cos(theta);
        const s = Math.sin(theta);

        const rotated = CG.Vector3(
            direction.x * c + cross.x * s + v.x * dot * (1 - c),
            direction.y * c + cross.y * s + v.y * dot * (1 - c),
            direction.z * c + cross.z * s + v.z * dot * (1 - c)
        );
        view.srp = view.prp.add(rotated);
        
        view.vup = v;

        if (!this.enable_animation) {
            this.draw();
        }
    }

    //
    rotateLeft() {
        this.rotateCamera(5 * Math.PI / 180);
    }
    
    //
    rotateRight() {
        this.rotateCamera(-5 * Math.PI / 180);
    }
    
    //
    moveLeft() {
        let view = this.scene.view;
        let n = view.prp.subtract(view.srp);
        n.normalize();
        let u = view.vup.cross(n);
        u.normalize();


        view.prp = view.prp.subtract(u);
        view.srp = view.srp.subtract(u);
        if (this.enable_animation === false) {
            this.draw();
        }

    }
    
    //
    moveRight() {
        let view = this.scene.view;
        let n = view.prp.subtract(view.srp);
        n.normalize();
        let u = view.vup.cross(n);
        u.normalize();

        view.prp = view.prp.add(u);
        view.srp = view.srp.add(u);
        if (this.enable_animation === false) {
            this.draw();
        }

    }
    
    //
    moveBackward() {
        let view = this.scene.view;
        let n = view.prp.subtract(view.srp);
        n.normalize();
        let u = view.vup.cross(n);
        u.normalize();

        view.prp = view.prp.add(n);
        view.srp = view.srp.add(n);
        if (this.enable_animation === false) {
            this.draw();
        }

    }
    
    //
    moveForward() {
        let view = this.scene.view;
        let n = view.prp.subtract(view.srp);
        n.normalize();
        let u = view.vup.cross(n);
        u.normalize();
        n.scale(-1);

        view.prp = view.prp.add(n);
        view.srp = view.srp.add(n);
        if (this.enable_animation === false) {
            this.draw();
        }

    }

    //
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const view = this.scene.view;
        const normalization = CG.mat4x4Perspective(
            view.prp, view.srp, view.vup, view.clip
        );
        const projection = CG.mat4x4MPer();
        const viewport = CG.mat4x4Viewport(this.canvas.width, this.canvas.height);
        const zMin = -view.clip[4] / view.clip[5];

        const projectToScreen = (point) => {
            const projected = Matrix.multiply([projection, point]);
            if (!Number.isFinite(projected.w) || projected.w <= 0) {
                return null;
            }
            const divided = CG.Vector4(
                projected.x / projected.w,
                projected.y / projected.w,
                projected.z / projected.w,
                1
            );
            const screen = Matrix.multiply([viewport, divided]);
            return Number.isFinite(screen.x) && Number.isFinite(screen.y)
                ? screen : null;
        };

        for (const model of this.scene.models) {
            // Parametric shapes must have their vertices and edges generated first
            if (!model.vertices || !model.edges) {
                continue;
            }
            const transform = Matrix.multiply([normalization, model.matrix]);
            const vertices = model.vertices.map((vertex) =>
                Matrix.multiply([transform, vertex])
            );

            for (const edge of model.edges) {
                // An edge list is a polyline: [0,1,2] means segments 0-1 and 1-2
                for (let i = 0; i < edge.length - 1; i++) {
                    const clipped = this.clipLinePerspective({
                        pt0: vertices[edge[i]],
                        pt1: vertices[edge[i + 1]]
                    }, zMin);
                    if (clipped === null) {
                        continue;
                    }
                    const start = projectToScreen(clipped.pt0);
                    const end = projectToScreen(clipped.pt1);
                    if (start !== null && end !== null) {
                        this.drawLine(start.x, start.y, end.x, end.y);
                    }
                }
            }
        }
    }

    // Get outcode for a vertex
    // vertex:       Vector4 (transformed vertex in homogeneous coordinates)
    // z_min:        float (near clipping plane in canonical view volume)
    outcodePerspective(vertex, z_min) {
        let outcode = 0;
        if (vertex.x < (vertex.z - FLOAT_EPSILON)) {
            outcode += LEFT;
        }
        else if (vertex.x > (-vertex.z + FLOAT_EPSILON)) {
            outcode += RIGHT;
        }
        if (vertex.y < (vertex.z - FLOAT_EPSILON)) {
            outcode += BOTTOM;
        }
        else if (vertex.y > (-vertex.z + FLOAT_EPSILON)) {
            outcode += TOP;
        }
        if (vertex.z < (-1.0 - FLOAT_EPSILON)) {
            outcode += FAR;
        }
        else if (vertex.z > (z_min + FLOAT_EPSILON)) {
            outcode += NEAR;
        }
        return outcode;
    }

    // Clip line - should either return a new line (with two endpoints inside view volume)
    //             or null (if line is completely outside view volume)
    // line:         object {pt0: Vector4, pt1: Vector4}
    // z_min:        float (near clipping plane in canonical view volume)
    clipLinePerspective(line, z_min) {
        let result = null;
        let p0 = CG.Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
        let p1 = CG.Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
        let out0 = this.outcodePerspective(p0, z_min);
        let out1 = this.outcodePerspective(p1, z_min);
        
        // TODO: implement clipping here!
        
        let w0 = line.pt0.w;
        let w1 = line.pt1.w
        let sameSide = false;
        
        if (p0.x < p0.z - FLOAT_EPSILON && p1.x < p1.z - FLOAT_EPSILON) {
            sameSide = true;
        }
        if (p0.x > -p0.z + FLOAT_EPSILON && p1.x > -p1.z + FLOAT_EPSILON) {
            sameSide = true;
        }
        if (p0.y < p0.z - FLOAT_EPSILON && p1.y < p1.z - FLOAT_EPSILON) {
            sameSide = true;
        }
        if (p0.y > -p0.z + FLOAT_EPSILON && p1.y > -p1.z + FLOAT_EPSILON) {
            sameSide = true;
        }
        if (p0.z < -1 - FLOAT_EPSILON && p1.z < -1 - FLOAT_EPSILON) {
            sameSide = true;
        }
        if (p0.z > z_min + FLOAT_EPSILON && p1.z > z_min + FLOAT_EPSILON) {
            sameSide = true;
        }

        if (out0 === 0 && out1 === 0) {
            result = {
                pt0: CG.Vector4(p0.x, p0.y, p0.z, w0),
                pt1: CG.Vector4(p1.x, p1.y, p1.z, w1)

            };
        }
        else if (sameSide === true) {
            result = null;
        }
        else {
            let useP0 = (out0 != 0);
            let pt = p1;
            if (useP0) {
                pt = p0;
            }

            let x0 = p0.x;
            let y0 = p0.y;
            let z0 = p0.z;
            let dx = p1.x - p0.x;
            let dy = p1.y - p0.y;
            let dz = p1.z - p0.z;

            let t = 0;
            let denominator = 1;
            // intersection t value
            // left
            if (pt.x < pt.z - FLOAT_EPSILON) {
                denominator = dx - dz;
                t = (-x0 + z0) / denominator;
            }
            // right
            else if (pt.x > -pt.z + FLOAT_EPSILON) {
                denominator = -dx - dz;
                t = (x0 + z0) / denominator;
            }

            // bottom
            else if (pt.y < pt.z - FLOAT_EPSILON) {
                denominator = dy - dz;
                t = (-y0 + z0) / denominator;
            }
            // top
            else if (pt.y > -pt.z + FLOAT_EPSILON) {
                denominator = -dy - dz;
                t = (y0 + z0) / denominator;
            }
            // far
            else if (pt.z < -1 - FLOAT_EPSILON) {
                denominator = dz;
                t = (-z0 - 1) / denominator;
            }
            // near 
            else {
                denominator = -dz;
                t = (z0 - z_min) / denominator;
            }

            if (Math.abs(denominator) > FLOAT_EPSILON) {
                let newX = x0 + t * dx;
                let newY = y0 + t * dy;
                let newZ = z0 + t * dz;
                let newW = w0 + t * (w1 - w0);

                if (useP0) {
                    let newLine = {
                        pt0: CG.Vector4(newX, newY, newZ, newW),
                        pt1: CG.Vector4(p1.x, p1.y, p1.z, w1)
                    };
                    result = this.clipLinePerspective(newLine, z_min);
                }
                else {
                    let newLine = {
                        pt0: CG.Vector4(p0.x, p0.y, p0.z, w0),
                        pt1: CG.Vector4(newX, newY, newZ, newW)
                    };
                    result = this.clipLinePerspective(newLine, z_min);
                }

            }
        }

        return result;
    }

    //
    animate(timestamp) {
        // Get time and delta time for animation
        if (this.start_time === null) {
            this.start_time = timestamp;
            this.prev_time = timestamp;
        }
        let time = timestamp - this.start_time;
        let delta_time = timestamp - this.prev_time;

        // Update transforms for animation
        this.updateTransforms(time, delta_time);

        // Draw slide
        this.draw();

        // Invoke call for next frame in animation
        if (this.enable_animation) {
            window.requestAnimationFrame((ts) => {
                this.animate(ts);
            });
        }

        // Update previous time to current one for next calculation of delta time
        this.prev_time = timestamp;
    }

    //
    updateScene(scene) {
        this.scene = this.processScene(scene);
        if (!this.enable_animation) {
            this.draw();
        }
    }

    //
    processScene(scene) {
        let processed = {
            view: {
                prp: CG.Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]),
                srp: CG.Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]),
                vup: CG.Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]),
                clip: [...scene.view.clip]
            },
            models: []
        };

        for (let i = 0; i < scene.models.length; i++) {
            let model = { type: scene.models[i].type };
            if (model.type === 'generic') {
                model.vertices = [];
                model.edges = JSON.parse(JSON.stringify(scene.models[i].edges));
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    model.vertices.push(CG.Vector4(scene.models[i].vertices[j][0],
                                                   scene.models[i].vertices[j][1],
                                                   scene.models[i].vertices[j][2],
                                                   1));
                    if (scene.models[i].hasOwnProperty('animation')) {
                        model.animation = JSON.parse(JSON.stringify(scene.models[i].animation));
                    }
                }
            }
            else {
                model.center = CG.Vector4(scene.models[i].center[0],
                                         scene.models[i].center[1],
                                         scene.models[i].center[2],
                                         1);
                for (let key in scene.models[i]) {
                    if (scene.models[i].hasOwnProperty(key) && key !== 'type' && key != 'center') {
                        model[key] = JSON.parse(JSON.stringify(scene.models[i][key]));
                    }
                }
            }

            model.matrix = new Matrix(4, 4);
            processed.models.push(model);
        }

        return processed;
    }
    
    // x0:           float (x coordinate of p0)
    // y0:           float (y coordinate of p0)
    // x1:           float (x coordinate of p1)
    // y1:           float (y coordinate of p1)
    drawLine(x0, y0, x1, y1) {
        this.ctx.strokeStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();

        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(x0 - 2, y0 - 2, 4, 4);
        this.ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    }
};

export { Renderer };