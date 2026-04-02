import { resizeAspectRatio } from '../../util/util.js';
import { Shader, readShaderFile } from '../../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;
let vao;
let shader;
let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    
    return true;
}

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.1,  0.5,
        -0.1, -0.5,
         0.1, -0.5,
         0.1,  0.5
    ]);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function render(currentTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!startTime) startTime = currentTime;
    const elapsedTime = (currentTime - startTime) / 1000;

    const angleBig = Math.sin(elapsedTime) * Math.PI * 2;
    const angleSmall = Math.sin(elapsedTime) * Math.PI * -10;

    shader.use();
    gl.bindVertexArray(vao);

    const m = mat4.create();
    shader.setMat4("u_transform", m);
    shader.setVec4("u_color", [0.6, 0.4, 0.2, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    const mL = mat4.create();
    mat4.translate(mL, mL, [0.0, 0.5, 0]);
    mat4.scale(mL, mL, [0.5, 0.5, 1]);
    mat4.rotate(mL, mL, angleBig + Math.PI / 2, [0, 0, 1]);
    shader.setMat4("u_transform", mL);
    shader.setVec4("u_color", [1.0, 1.0, 1.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    const mS1 = mat4.create();
    mat4.translate(mS1, mL, [0.0, 0.5, 0]);
    mat4.scale(mS1, mS1, [0.3, 0.3, 1]);
    mat4.rotate(mS1, mS1, angleSmall, [0, 0, 1]);
    shader.setMat4("u_transform", mS1);
    shader.setVec4("u_color", [0.6, 0.6, 0.6, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    const mS2 = mat4.create();
    mat4.translate(mS2, mL, [0.0, -0.5, 0]);
    mat4.scale(mS2, mS2, [0.3, 0.3, 1]);
    mat4.rotate(mS2, mS2, angleSmall, [0, 0, 1]);
    shader.setMat4("u_transform", mS2);
    shader.setVec4("u_color", [0.6, 0.6, 0.6, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function animate(currentTime) {
    render(currentTime);
    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        await initShader();
        setupBuffers();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
