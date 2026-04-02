import { resizeAspectRatio } from '../../util/util.js';
import { Shader, readShaderFile } from '../../util/shader.js';

let isInitialized = false;

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader;
let vao;
let startTime = 0;

const BG_COLOR = [0.11, 0.20, 0.31, 1.0];
const COLOR_POLE = [0.56, 0.37, 0.18, 1.0];
const COLOR_BLADE_BIG = [0.95, 0.95, 0.95, 1.0];
const COLOR_BLADE_SMALL = [0.65, 0.65, 0.65, 1.0];

const HUB_POS = [0.0, 0.50];

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;

    main().then((success) => {
        if (!success) return;
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch((error) => {
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
    gl.clearColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_COLOR[3]);
    return true;
}

function setupBuffers() {
    const rectVertices = new Float32Array([
        -0.5,  0.5,
        -0.5, -0.5,
         0.5,  0.5,
         0.5, -0.5,
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, rectVertices, gl.STATIC_DRAW);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function createTRS(tx, ty, angle, sx, sy) {
    const m = mat4.create();
    mat4.translate(m, m, [tx, ty, 0]);
    mat4.rotate(m, m, angle, [0, 0, 1]);
    mat4.scale(m, m, [sx, sy, 1]);
    return m;
}

function createBladeTransform(hubX, hubY, angle, length, thickness) {
    const m = mat4.create();
    mat4.translate(m, m, [hubX, hubY, 0]);
    mat4.rotate(m, m, angle, [0, 0, 1]);
    mat4.translate(m, m, [length * 0.5, 0, 0]);
    mat4.scale(m, m, [length, thickness, 1]);
    return m;
}

function createTipBladeTransform(hubX, hubY, bigAngle, smallAngle, bigLength, smallLength, smallThickness) {
    const m = mat4.create();
    mat4.translate(m, m, [hubX, hubY, 0]);
    mat4.rotate(m, m, bigAngle, [0, 0, 1]);
    mat4.translate(m, m, [bigLength, 0, 0]);
    mat4.rotate(m, m, smallAngle, [0, 0, 1]);
    mat4.translate(m, m, [0.0, 0.0, 0]);
    mat4.scale(m, m, [smallLength, smallThickness, 1]);
    return m;
}

function drawRect(transform, color) {
    shader.setMat4('u_transform', transform);
    shader.setVec4('u_color', color);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render(currentTimeMs) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();

    if (!startTime) startTime = currentTimeMs;
    const elapsedTime = (currentTimeMs - startTime) / 1000.0;

    const bigAngle = Math.sin(elapsedTime) * Math.PI * 2.0;
    const smallAngle = Math.sin(elapsedTime) * Math.PI * -10.0;

    const poleTransform = createTRS(0.0, 0.0, 0.0, 0.20, 1.00);
    drawRect(poleTransform, COLOR_POLE);

    const bigLen = 0.30;
    const bigThick = 0.09;
    drawRect(createBladeTransform(HUB_POS[0], HUB_POS[1], bigAngle, bigLen, bigThick), COLOR_BLADE_BIG);
    drawRect(createBladeTransform(HUB_POS[0], HUB_POS[1], bigAngle + Math.PI, bigLen, bigThick), COLOR_BLADE_BIG);

    const smallLen = 0.16;
    const smallThick = 0.04;
    drawRect(
        createTipBladeTransform(HUB_POS[0], HUB_POS[1], bigAngle, smallAngle, bigLen, smallLen, smallThick),
        COLOR_BLADE_SMALL
    );
    drawRect(
        createTipBladeTransform(HUB_POS[0], HUB_POS[1], bigAngle + Math.PI, -smallAngle, bigLen, smallLen, smallThick),
        COLOR_BLADE_SMALL
    );
}

function animate(currentTimeMs) {
    render(currentTimeMs);
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
        return false;
    }
}
