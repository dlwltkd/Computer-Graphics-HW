/*-------------------------------------------------------------------------
08_Transformation.js

canvas의 중심에 한 edge의 길이가 0.3인 정사각형을 그리고, 
이를 크기 변환 (scaling), 회전 (rotation), 이동 (translation) 하는 예제임.
    T는 x, y 방향 모두 +0.5 만큼 translation
    R은 원점을 중심으로 2초당 1회전의 속도로 rotate
    S는 x, y 방향 모두 0.3배로 scale
이라 할 때, 
    keyboard 1은 TRS 순서로 적용
    keyboard 2는 TSR 순서로 적용
    keyboard 3은 RTS 순서로 적용
    keyboard 4는 RST 순서로 적용
    keyboard 5는 STR 순서로 적용
    keyboard 6은 SRT 순서로 적용
    keyboard 7은 원래 위치로 돌아옴
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let axes;
let finalTransform;
let rotationAngle1 = 0;
let rotationAngle2 = 0;
let currentTransformType = null;
let isAnimating = false;
let lastTime = 0;
let textOverlay; 

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
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupBuffers() {
    const pillar = new Float32Array([
        -0.1, 0.4,
        -0.1, -0.5,
        0.1, -0.5,
        0.1, 0.4,
        -0.3, 0.45, // 큰날개
        -0.3, 0.35,
        0.3, 0.35,
        0.3, 0.45,
        -0.4, 0.42, // 작은날개1
        -0.4, 0.38,
        -0.2, 0.38,
        -0.2, 0.42,
        0.2, 0.42, // 작은날개2
        0.2, 0.38,
        0.4, 0.38,
        0.4, 0.42,
    ]
    );

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3,     // 두 번째 삼각형
        4, 5, 6,     // 두 번째 삼각형
        4, 6, 7,
        8,9,10,
        8,10,11,
        12,13,14,
        12,14,15
    ]);

    const cubeColors = new Float32Array([
        0.7, 0.3, 0.0, 1.0,  // 갈색
        0.7, 0.3, 0.0, 1.0,
        0.7, 0.3, 0.0, 1.0, 
        0.7, 0.3, 0.0, 1.0, 
        1, 1, 1, 1.0,  // 흰색
        1, 1, 1, 1.0, 
        1, 1, 1, 1.0,
        1, 1, 1, 1.0,  
        0.5, 0.5, 0.5, 1.0,  // 회색1
        0.5, 0.5, 0.5, 1.0,  
        0.5, 0.5, 0.5, 1.0,  // 빨간색
        0.5, 0.5, 0.5, 1.0,  // 빨간색
        0.5, 0.5, 0.5, 1.0,  // 빨간색
        0.5, 0.5, 0.5, 1.0,  // 빨간색
        0.5, 0.5, 0.5, 1.0,  // 빨간색
        0.5, 0.5, 0.5, 1.0,  // 빨간색
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const pillarpositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pillarpositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pillar, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);
    // EBO
    const indexBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer2);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function setupKeyboardEvents() {
    let key;
    document.addEventListener('keydown', (event) => {
        key = event.key;
        switch(key) {
            case '1': currentTransformType = 'TRS'; isAnimating = true; break;
            case '2': currentTransformType = 'TSR'; isAnimating = true; break;
            case '3': currentTransformType = 'RTS'; isAnimating = true; break;
            case '4': currentTransformType = 'RST'; isAnimating = true; break;
            case '5': currentTransformType = 'STR'; isAnimating = true; break;
            case '6': currentTransformType = 'SRT'; isAnimating = true; break;
            case '7':
                currentTransformType = null;
                isAnimating = false;
                rotationAngle = 0;
                finalTransform = mat4.create();
                break;
        }
        if (currentTransformType) {
            updateText(textOverlay, event.key + ': ' + currentTransformType);
        } else {
            updateText(textOverlay, 'NO TRANSFORMA1TION');
        }
    });
}

function getTransformMatrices() {
    const T = mat4.create();
    const R = mat4.create();
    const S = mat4.create();
    
    mat4.translate(T, T, [0.5, 0.5, 0]);  // translation by (0.5, 0.5)
    mat4.rotate(R, R, rotationAngle, [0, 0, 1]); // rotation about z-axis
    mat4.scale(S, S, [0.3, 0.3, 1]); // scale by (0.3, 0.3)
    
    return { T, R, S };
}

function applyTransform(type) {
    finalTransform = mat4.create();
    const { T, R, S } = getTransformMatrices();
    
    const transformOrder = {
        'TRS': [T, R, S],
        'TSR': [T, S, R],
        'RTS': [R, T, S],
        'RST': [R, S, T],
        'STR': [S, T, R],
        'SRT': [S, R, T]
    };

    /*
      type은 'TRS', 'TSR', 'RTS', 'RST', 'STR', 'SRT' 중 하나
      array.forEach(...) : 각 type의 element T or R or S 에 대해 반복
    */
    if (transformOrder[type]) {
        transformOrder[type].forEach(matrix => {
            mat4.multiply(finalTransform, matrix, finalTransform);
        });
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    axes.draw(mat4.create(), mat4.create());

    shader.use();
    gl.bindVertexArray(vao);

    const pillar = mat4.create();

    const bigWing = mat4.create();
    mat4.translate(bigWing, bigWing, [0, 0.4, 0]);
    mat4.rotate(bigWing, bigWing, rotationAngle1, [0, 0, 1]);
    mat4.translate(bigWing, bigWing, [0, -0.4, 0]);

    const smallWing1Local = mat4.create();
    mat4.translate(smallWing1Local, smallWing1Local, [-0.3, 0.4, 0]);
    mat4.rotate(smallWing1Local, smallWing1Local, rotationAngle2, [0, 0, 1]);
    mat4.translate(smallWing1Local, smallWing1Local, [0.3, -0.4, 0]);

    const smallWing2Local = mat4.create();
    mat4.translate(smallWing2Local, smallWing2Local, [0.3, 0.4, 0]);
    mat4.rotate(smallWing2Local, smallWing2Local, rotationAngle2, [0, 0, 1]);
    mat4.translate(smallWing2Local, smallWing2Local, [-0.3, -0.4, 0]);

    const smallWing1World = mat4.create();
    mat4.multiply(smallWing1World, bigWing, smallWing1Local);

    const smallWing2World = mat4.create();
    mat4.multiply(smallWing2World, bigWing, smallWing2Local);

    shader.setMat4("u_transform", pillar);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    shader.setMat4("u_transform", bigWing);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12);

    shader.setMat4("u_transform", smallWing1World);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 24);

    shader.setMat4("u_transform", smallWing2World);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 36);
}

function animate(currentTime) {

    if (!lastTime) lastTime = currentTime; // if lastTime == 0
    // deltaTime: 이전 frame에서부터의 elapsed time (in seconds)
    let deltaTime = (currentTime - lastTime) / 1000;
    rotationAngle1 = Math.PI * Math.sin(deltaTime) * 2;
    rotationAngle2 = Math.PI * Math.sin(deltaTime) * 10;
    render();
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

        finalTransform = mat4.create();
        
        await initShader();

        setupBuffers();
        axes = new Axes(gl, 0.8); 

        textOverlay = setupText(canvas, 'NO TRANSFORMATION', 1);
        setupText(canvas, 'press 1~7 to apply different order of transformations', 2);

        setupKeyboardEvents();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
