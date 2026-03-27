import { resizeAspectRatio, setupText, updateText, Axes } from '../../util/util.js';
import { Shader, readShaderFile } from '../../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;
let shader;
let vao;
let positionBuffer;
let mode = 0;
let isDrawing = false;
let center = null;
let radius = null;
let lineStart = null;
let tempLineEnd = null;
let intersections = [];
let textOverlay;
let textOverlay2; 
let textOverlay3;
let axes = new Axes(gl, 0.85);

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
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

function getIntersectionPoints(cx, cy, r, x1, y1, x2, y2) {
    const a = x2 - x1;
    const b = y2 - y1;
    const A = a * a + b * b;
    const B = 2 * (a * (x1 - cx) + b * (y1 - cy));
    const C = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
    const D = B * B - 4 * A * C;

    let points = [];
    if (A === 0 || D < 0) return points;

    const t1 = (-B - Math.sqrt(D)) / (2 * A);
    const t2 = (-B + Math.sqrt(D)) / (2 * A);

    if (t1 >= 0 && t1 <= 1) {
        points.push([x1 + t1 * a, y1 + t1 * b]);
    }
    if (D > 0 && t2 >= 0 && t2 <= 1) {
        points.push([x1 + t2 * a, y1 + t2 * b]);
    }
    return points;
}

function getCircleVertices(cx, cy, r, segments = 100) {
    const vertices = [];
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        vertices.push(cx + r * Math.cos(theta), cy + r * Math.sin(theta));
    }
    return vertices;
}

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation(); 

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let [glX, glY] = convertToWebGLCoordinates(x, y);

        if (mode === 0) { 
            center = [glX, glY];
            isDrawing = true; 
        }
        else if (mode === 1) { 
            lineStart = [glX, glY];
            isDrawing = true;
        }
    }

    function handleMouseMove(event) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let [glX, glY] = convertToWebGLCoordinates(x, y);

        if (mode == 0) { 
            radius = Math.sqrt((glX - center[0]) ** 2 + (glY - center[1]) ** 2);
            render();
        }
        else if (mode == 1) {
            tempLineEnd = [glX, glY];
            render();
        }
    }

    function handleMouseUp() {
        if (!isDrawing) return;
        isDrawing = false;

        if (mode === 0 && radius > 0) {
            mode = 1;
            updateText(textOverlay, 
                "Circle: center (" + 
                center[0].toFixed(2) + ", " + 
                center[1].toFixed(2) + ") radius = " + 
                radius.toFixed(2));
            render();
        }
        else if (mode === 1 && tempLineEnd) {
            mode = 2;
            updateText(textOverlay2, 
                "Line segement: (" + 
                lineStart[0].toFixed(2) + ", " + 
                lineStart[1].toFixed(2) + ") ~ (" + 
                tempLineEnd[0].toFixed(2) + ", " + 
                tempLineEnd[1].toFixed(2) + ")");

            intersections = getIntersectionPoints(center[0], center[1], radius, 
                lineStart[0], lineStart[1], tempLineEnd[0], tempLineEnd[1]);

            if (intersections.length === 2) {
                updateText(textOverlay3, 
                    "Intersection Points: 2 Point 1: (" + 
                    intersections[0][0].toFixed(2) + ", " + 
                    intersections[0][1].toFixed(2) + ") Point 2: (" + 
                    intersections[1][0].toFixed(2) + ", " + 
                    intersections[1][1].toFixed(2) + ")");
            } 
            else if (intersections.length === 1) {
                updateText(textOverlay3, 
                    "Intersection Points: 1 Point 1: (" + 
                    intersections[0][0].toFixed(2) + ", " + 
                    intersections[0][1].toFixed(2) + ")");
            } 
            else {
                updateText(textOverlay3, "No intersection");
            }
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.use();

    if (center && radius) {
        let circleVertices = getCircleVertices(center[0], center[1], radius);
        if (mode === 0) shader.setVec4("u_color", [1.0, 1.0, 1.0, 1.0]);
        else shader.setVec4("u_color", [0.7, 0.2, 0.8, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, circleVertices.length / 2);
    }
    if (lineStart && tempLineEnd) {
        shader.setVec4("u_color", [1.0, 1.0, 1.0, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lineStart, ...tempLineEnd]), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }
    if (intersections.length > 0) {
        let points = [];
        for (const point of intersections) {
            points.push(point[0], point[1]);
        }
        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, intersections.length);
    }

    axes.draw(mat4.create(), mat4.create());
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
            return false; 
        }
        await initShader();
        setupBuffers();
        shader.use();

        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);
        
        setupMouseEvents();
        render();
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
