// 顶点数与FPS显示功能集成版
"use strict";

var canvas;
var gl;

var numTimesToSubdivide = 0; 
var points = [];
var colorsOfVertexs = [];

var bufferId;
var colorbufferId;

var vertices = [
    vec2(-0.6, -0.6),
    vec2(0, 0.6),
    vec2(0.6, -0.6)
];

var c1 = vec4(1.0, 0.0, 0.0, 1.0);
var c2 = vec4(0.0, 1.0, 0.0, 1.0);
var c3 = vec4(0.0, 0.0, 1.0, 1.0);

var theta = 0.0;
var speed = 0.1;
var thetaLoc;
var centerX = 0.0;
var centerXLoc;
var centerY = 0.0;
var centerYLoc;

var animflag = false;
var sliderchangeflag = false;
var centerchageflag = false;

var frame = 0;
var lastTime = Date.now();

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    divideTriangle(vertices[0], vertices[1], vertices[2], numTimesToSubdivide);
    updateVertexCount();

    var program = initShaders(gl, "shaders/gasket2D.vert", "shaders/gasket2D.frag");
    gl.useProgram(program);

    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);    
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    colorbufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorbufferId);    
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsOfVertexs), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    thetaLoc = gl.getUniformLocation(program, "theta");
    centerXLoc = gl.getUniformLocation(program, "centerX");
    centerYLoc = gl.getUniformLocation(program, "centerY");
    
    render();

    document.getElementById("slider").onchange = function(event) {
        numTimesToSubdivide = parseInt(event.target.value);
        points = [];
        colorsOfVertexs = [];
        divideTriangle(vertices[0], vertices[1], vertices[2], numTimesToSubdivide);
        sliderchangeflag = true;
        updateVertexCount();
    };    

    canvas.addEventListener("mousedown", function(event) {
        var rect = canvas.getBoundingClientRect();
        centerX = (event.clientX - rect.left) / rect.width * 2 - 1;
        centerY = -(event.clientY - rect.top) / rect.height * 2 + 1;
        centerchageflag = true;
    });
        
    document.getElementById("Animation").onclick = function() {
        animflag = !animflag;
        this.value = animflag ? "Stop Rotation" : "Start Rotation";
    };
    
    document.getElementById("speedUp").onclick = function() {
        speed += 0.05; 
    };
    
    document.getElementById("speedDown").onclick = function() {
        speed -= 0.05; 
    };
}

function triangle(a, b, c) {
    points.push(a, b, c);    
    colorsOfVertexs.push(c1, c2, c3);
}

function divideTriangle(a, b, c, count) {
    if (count === 0) {
        triangle(a, b, c);
    } else {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);
        
        divideTriangle(a, ab, ac, count-1);
        divideTriangle(ab, b, bc, count-1);
        divideTriangle(ac, bc, c, count-1);
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (animflag) {
        theta += speed;
        gl.uniform1f(thetaLoc, theta);    
    }

    if (sliderchangeflag) {    
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);    
        gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorbufferId);    
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsOfVertexs), gl.STATIC_DRAW);
    }

    if (centerchageflag) {
        gl.uniform1f(centerXLoc, centerX);
        gl.uniform1f(centerYLoc, centerY);
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, points.length);    
    sliderchangeflag = false;
    centerchageflag = false;
    
    countFPS();
    requestAnimationFrame(render);
}

function updateVertexCount() {
    document.getElementById("vertexCount").innerHTML = `顶点数: ${points.length}`;
}

function countFPS() {
    var now = Date.now();
    frame++;
    if (now - lastTime >= 1000) {
        var fps = Math.round(frame * 1000 / (now - lastTime));
        document.getElementById("fpsDisplay").innerHTML = "FPS: " + fps;
        frame = 0;
        lastTime = now;
    }
}

// 初始化执行
window.onload = init;
window.onresize = function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    gl.viewport((canvas.width - canvas.height) / 2, 0, canvas.height, canvas.height);
    render();
};