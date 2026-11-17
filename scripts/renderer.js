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
        this.enable_animation = false;  // <-- disabled for easier debugging; enable for animation
        this.start_time = null;
        this.prev_time = null;
    }

    //
    updateTransforms(time, delta_time) {
        // TODO: update any transformations needed for animation
    }

    //
    rotateLeft() {

    }
    
    //
    rotateRight() {

    }
    
    //
    moveLeft() {
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

        // TODO: implement drawing here!
        // For each model
        //   * For each vertex
        //     * transform endpoints to canonical view volume
        //   * For each line segment in each edge
        //     * clip in 3D
        //     * project to 2D
        //     * translate/scale to viewport (i.e. window)
        //     * draw line
        let view = this.scene.view;
        let z_min = -view.clip[4] / view.clip[5];
        let transform = CG.mat4x4Perspective(view.prp, view.srp, view.vup, view.clip);
        let mper = CG.mat4x4MPer();
        let viewport = CG.mat4x4Viewport(this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.scene.models.length; i++) {
            let model = this.scene.models[i];

            let transformed = [];
            for (let j = 0; j < model.vertices.length; j++) {
                let vertex = Matrix.multiply([transform, model.matrix, model.vertices[j]]);
                transformed.push(vertex);
            }

            for (let j = 0; j < model.edges.length; j++) {
                let edge = model.edge[j];
                for (let k = 0; k < edges.length - 1; k++) {
                    let line = {
                        pt0: transformed[edge[k]],
                        pt1: transformed[edge[k + 1]]
                    };
                    let clipped = this.clipLinePerspective(line, z_min);

                    if (clipped !== null) {
                        let point0 = Matrix.multiply([viewport, mper, clipped.pt0]);
                        let point1 = Matrix.multiply([viewport, mper, clipped.pt1]);
                        let x0 = point0.x / point0.w;
                        let y0 = point0.y / point0.w;
                        let x1 = point1.x / point0.w;
                        let y1 = point1.y / point0.w;

                        this.drawLine(x0, y0, x1, y1);

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
        let p0 = Vector3(line.pt0.x, line.pt0.y, line.pt0.z); 
        let p1 = Vector3(line.pt1.x, line.pt1.y, line.pt1.z);
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
                let centerX = model.center.x;
                let centerY = model.center.y;
                let centerZ = model.center.z;

                if (model.type === 'cube') {
                    let halfW = model.width / 2;
                    let halfH = model.height / 2;
                    let halfD = model.depth / 2;

                    model.vertices = [
                        CG.Vector4(centerX - halfW, centerY + halfH, centerZ + halfD, 1),
                        CG.Vector4(centerX + halfW, centerY + halfH, centerZ + halfD, 1),
                        CG.Vector4(centerX + halfW, centerY - halfH, centerZ + halfD, 1),
                        CG.Vector4(centerX - halfW, centerY - halfH, centerZ + halfD, 1),
                        CG.Vector4(centerX - halfW, centerY + halfH, centerZ - halfD, 1),
                        CG.Vector4(centerX + halfW, centerY + halfH, centerZ - halfD, 1),
                        CG.Vector4(centerX + halfW, centerY - halfH, centerZ - halfD, 1),
                        CG.Vector4(centerX - halfW, centerY - halfH, centerZ - halfD, 1),
                    ];
                    model.edges = [
                        [0, 1, 2, 3, 0],
                        [4, 5, 6, 7, 4],
                        [0, 4],
                        [1, 5],
                        [2, 6],
                        [3, 7]
                    ];
                }
                else if (model.type === 'cone') {
                    let radius = model.radius;
                    let height = model.height;
                    let sides = model.sides;
                    model.vertices = [];
                    model.edges = [];
                    for (let side = 0; side < sides; side++) {
                        let angle = 2 * Math.PI * side / sides;
                        model.vertices.push(CG.Vector4(centerX + radius * Math.cos(angle), centerY, centerZ + radius * Math.sin(angle), 1));
                    }
                    model.vertices.push(CG.Vector4(centerX, centerY + height, centerZ, 1));
                    let pointy = sides;

                    let base = [];
                    for (let side = 0; side < sides; side++) {
                        base.push(side);
                    }
                    base.push(0);
                    model.edges.push(base);

                    for (let side = 0; side < sides; side++) {
                        model.edges.push([side, pointy]);
                    }
                }

                else if (model.type === 'cylinder') {
                    let radius = model.radius;
                    let height = model.height;
                    let sides = model.sides;
                    let bottomY = centerY - height / 2;
                    let topY = centerY + height / 2;

                    model.vertices = [];
                    model.edges = [];

                    for (let side = 0; side < sides; side++) {
                        let angle = 2 * Math.PI * side / sides;
                        model.vertices.push(CG.Vector4(centerX + radius * Math.cos(angle), bottomY, centerZ + radius * Math.sin(angle), 1));
                    }
                    for (let side = 0; side < sides; side++) {
                        let angle = 2 * Math.PI * side / sides;
                        model.vertices.push(CG.Vector4(centerX + radius * Math.cos(angle), topY, centerZ + radius * Math.sin(angle), 1));
                    }

                    let bottom = [];
                    for (let side = 0; side < sides; side++) {
                        bottom.push(side);
                    }
                    bottom.push(0);
                    model.edges.push(bottom);

                    let top = [];
                    for (let side = 0; side < sides; side++) {
                        top.push(sides + side);
                    }
                    top.push(sides);
                    model.edges.push(top);

                    for (let side = 0; side < sides; side++) {
                        model.edges.push([side, sides + side]);
                    }
   
                }
                else if (model.type === 'sphere') {
                    let radius = model.radius;
                    let numLongitudeLines = model.slices;
                    let numLatitudeLines = model.stacks;
                    model.vertices = [];
                    model.edges = [];
                    model.vertices.push(CG.Vector4(centerX, centerY + radius, centerZ, 1));

                    for (let latitude = 1; latitude <= numLatitudeLines; latitude++) {
                        let phi = Math.PI * latitude / (numLatitudeLines + 1);
                        let latitudeY = centerY + radius * Math.cos(phi);
                        let latitudeRadius = radius * Math.sin(phi);

                        for (let longitude = 0; longitude < numLongitudeLines; longitude++) {
                            let angleAround = 2 * Math.PI * longitude / numLongitudeLines;
                            model.vertices.push(CG.Vector4(centerX + latitudeRadius * Math.cos(angleAround), latitudeY, centerZ + latitudeRadius * Math.sin(angleAround), 1))
                        }
                    }

                    model.vertices.push(CG.Vector4(centerX, centerY - radius, centerZ, 1));
                    let bottomPole = 1 + numLatitudeLines * numLongitudeLines;

                    for (let latitude = 1; latitude <= numLatitudeLines; latitude++) {
                        let firstV = 1 + (latitude - 1) * numLongitudeLines;
                        let latEdge = [];
                        for (let longitude = 0; longitude < numLongitudeLines; longitude++) {
                            latEdge.push(firstV + longitude);
                        }
                        latEdge.push(firstV);
                        model.edges.push(latEdge);
                    }

                    for (let longitude = 0; longitude < numLongitudeLines; longitude++) {
                        
                        let lonEdge = [0];
                        for (let latitude = 1; latitude <= numLatitudeLines; latitude++) {
                            lonEdge.push(1 + (latitude - 1) * numLongitudeLines + longitude);
                        }
                        lonEdge.push(bottomPole);
                        model.edges.push(lonEdge);
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
