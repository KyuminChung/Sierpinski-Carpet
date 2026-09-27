"use strict";

// 기반 예제: Angel 교재 CODE/02/gasket2.js 및 강의 Gasket 예제.
// vec2, mix, flatten, initShaders, WebGLUtils는 동봉한 Common 원본에서 제공한다.

var gl;
var points = [];
var NumTimesToSubdivide = 5; // 초기 분할 횟수. 슬라이더로 0~5회 제어한다.
var bufferId;
var colorLoc;

/* initial square */
var vertices = [
    vec2(-0.9, -0.9),
    vec2( 0.9, -0.9),
    vec2( 0.9,  0.9),
    vec2(-0.9,  0.9)
];

window.onload = function init() {
    try {
        var canvas = document.getElementById("gl-canvas");
        gl = WebGLUtils.setupWebGL(canvas);
        if (!gl) {
            throw new Error("이 브라우저에서는 WebGL을 사용할 수 없습니다.");
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        var program = initShaders(gl, "vertex-shader", "fragment-shader");
        if (program === -1) {
            throw new Error("셰이더 초기화에 실패했습니다. 셰이더 코드를 확인하세요.");
        }
        gl.useProgram(program);

        // 버퍼와 셰이더 연결은 처음 한 번만 준비한다.
        bufferId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

        var vPosition = gl.getAttribLocation(program, "vPosition");
        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        colorLoc = gl.getUniformLocation(program, "color");

        var subdivision = document.getElementById("subdivision");
        var colorPicker = document.getElementById("color-picker");

        // 교재 03/gasket5의 슬라이더 이벤트 구조를 Carpet에 적용한다.
        subdivision.oninput = function(event) {
            updateGeometry(Number(event.target.value));
            render();
        };

        colorPicker.oninput = function(event) {
            setColor(event.target.value);
            render();
        };

        updateGeometry(NumTimesToSubdivide);
        setColor(colorPicker.value);
        render();
        document.getElementById("controls").disabled = false;
    } catch (error) {
        var message = document.getElementById("error-message");
        message.textContent = error.message;
        message.hidden = false;
        console.error(error);
    }
};

// 분할 횟수가 바뀌면 정점만 다시 생성하여 기존 GPU 버퍼에 전달한다.
function updateGeometry(count) {
    if (!Number.isInteger(count) || count < 0 || count > 5) {
        throw new Error("분할 횟수는 0~5의 정수로 설정하세요.");
    }

    NumTimesToSubdivide = count;
    points = [];
    divideSquare(
        vertices[0], vertices[1], vertices[2], vertices[3],
        NumTimesToSubdivide
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    document.getElementById("subdivision").value = count;
    document.getElementById("subdivision-value").value = count;
    document.getElementById("status").textContent =
        "분할 횟수: " + count +
        " · 남은 작은 정사각형: " + (points.length / 6).toLocaleString() + "개";
}

// #RRGGBB의 각 성분을 0~255에서 0~1 범위로 변환하여 셰이더로 보낸다.
function setColor(colorValue) {
    var red = parseInt(colorValue.slice(1, 3), 16) / 255;
    var green = parseInt(colorValue.slice(3, 5), 16) / 255;
    var blue = parseInt(colorValue.slice(5, 7), 16) / 255;

    gl.uniform4f(colorLoc, red, green, blue, 1.0);
    document.getElementById("color-value").value = colorValue.toUpperCase();
}

// PPT의 triangle에 대응하는 함수: 정사각형 하나의 정점을 저장한다.
function square(a, b, c, d) {
    // WebGL에서는 정사각형을 삼각형 ABC, ACD로 표현한다.
    points.push(a, b, c, a, c, d);
}

// PPT의 divideTriangle을 정사각형의 3 × 3 분할로 확장한다.
function divideSquare(a, b, c, d, count) {
    // 종료 조건: 더 나누지 않고 정사각형 하나를 저장한다.
    if (count === 0) {
        square(a, b, c, d);
        return;
    }

    // 각 변을 3등분하여 9개 정사각형의 꼭짓점이 되는 4 × 4 격자를 만든다.
    // PPT의 mix(a, b, 0.5)와 같은 보간 방식으로 1/3, 2/3 위치를 구한다.
    var grid = [];
    for (var row = 0; row <= 3; row++) {
        var left = mix(a, d, row / 3);
        var right = mix(b, c, row / 3);
        grid[row] = [];

        for (var col = 0; col <= 3; col++) {
            grid[row][col] = mix(left, right, col / 3);
        }
    }

    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            // 중앙 영역은 그리지도, 다시 분할하지도 않는다.
            if (row === 1 && col === 1) {
                continue;
            }

            // count는 한 재귀 단계에서 정확히 1만 감소시킨다.
            divideSquare(
                grid[row][col],
                grid[row][col + 1],
                grid[row + 1][col + 1],
                grid[row + 1][col],
                count - 1
            );
        }
    }
}

// 화면을 지우고 저장된 삼각형을 한 번에 그린다.
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}
