export class SquarePyramid {
    constructor(gl, options = {}) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // Initializing data
        this.vertices = new Float32Array([
            // front face  (v0,v2,v3)
            0,  1,  0,  -0.5, 0,  0.5,   0.5, 0,  0.5,
            // right face  (v0,v3,v4)
            0,  1,  0,   0.5, 0,  0.5,   0.5, 0, -0.5,
            // left face   (v0,v1,v2)
            0,  1,  0,  -0.5, 0, -0.5,  -0.5, 0,  0.5,
            // back face   (v0,v4,v1)
            0,  1,  0,  0.5, 0, -0.5,  -0.5, 0, -0.5,
            // bottom face (v1,v4,v3,v2)
            -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0,  0.5,  -0.5, 0,  0.5
        ]);

        const val = 1 / Math.sqrt(5);
        this.normals = new Float32Array([
            // front face (v0,v2,v3)
            0, val, 2 * val,   0, val, 2 * val,   0, val, 2 * val,
            // right face (v0,v3,v4)
            2 * val, val, 0,   2 * val, val, 0,   2 * val, val, 0,
            // left face (v0,v1,v2)
            -2 * val, val, 0,  -2 * val, val, 0,  -2 * val, val, 0,
            // back face (v0,v4,v1)
            0, val, -2 * val,   0, val, -2 * val,   0, val, -2 * val,
            // bottom face (v1,v4,v3,v2)
            0, -1, 0,   0, -1, 0,   0, -1, 0,   0, -1, 0
        ]);

        if (options.color) {
            this.colors = new Float32Array(16 * 4);
            for (let i = 0; i < 16 * 4; i += 4) {
                this.colors[i] = options.color[0];
                this.colors[i+1] = options.color[1];
                this.colors[i+2] = options.color[2];
                this.colors[i+3] = options.color[3];
            }
        }
        else {
            this.colors = new Float32Array([
                // front face (v0,v2,v3) - red
                1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,
                // right face (v0,v3,v4) - yellow
                1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
                // left face (v0,v1,v2) - cyan
                0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
                // back face (v0,v4,v1) - magenta
                1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,
                // bottom face (v1,v4,v3,v2) - blue
                0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1
            ]);
        }

        this.texCoords = new Float32Array([
            // front face (v0,v2,v3)
            // u: 0.00 ~ 0.25
            0.125, 1,   0.00, 0,   0.25, 0,

            // right face (v0,v3,v4)
            // u: 0.25 ~ 0.50
            0.375, 1,   0.25, 0,   0.50, 0,

            // left face (v0,v1,v2)
            // u: 0.75 ~ 1.00
            0.875, 1,   0.75, 0,   1.00, 0,

            // back face (v0,v4,v1)
            // u: 0.50 ~ 0.75
            0.625, 1,   0.50, 0,   0.75, 0,

            // bottom face (v1,v4,v3,v2)
            // use whole texture image
            0, 1,   1, 1,   1, 0,   0, 0
        ]);

        this.indices = new Uint16Array([
            // front face
            0, 1, 2,
            // right face
            3, 4, 5,
            // left face
            6, 7, 8,
            // back face
            9, 10, 11,
            // bottom face
            12, 13, 14,  14, 15, 12
        ]);


        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);  // normal
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);  // color
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);  // texCoord

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    updateNormals() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {

        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
} 