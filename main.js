'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let pi = 3.14;
let u1 = -3.5 * pi;
let u2 = 3.5 * pi;
let uStep = 0.05;
let v1 = 0.005 * pi;
let v2 = pi / 2;
let vStep = 0.05;
let C = 2;

let vl;
let vs;
let hs;
let hl;

function degreeToRad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iVertexBufferOfNormal = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferOfNormal);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        // for (let i = 0;     i < vl;     i+=vs) {
        //     gl.drawArrays(gl.LINE_STRIP, i, vs);
        // }
        // for (let i = vl;    i < vl+hl;      i+=hs) {
        //     gl.drawArrays(gl.LINE_STRIP, i, hs);
        // }
        gl.drawArrays(gl.TRIANGLES, 0, this.count)
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 21);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0, 0], 0);
    let translateToPointZero = m4.translation(0, 0, -20);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    let normalMatrix = m4.identity();
    m4.inverse(modelView, normalMatrix);
    normalMatrix = m4.transpose(normalMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
    let posx = parseFloat(document.getElementById('lightPositionX').value)
    let posy = parseFloat(document.getElementById('lightPositionY').value)
    let posz = parseFloat(document.getElementById('lightPositionZ').value)
    let dirx = parseFloat(document.getElementById('lightDirectionX').value)
    let diry = parseFloat(document.getElementById('lightDirectionY').value)
    let dirz = parseFloat(document.getElementById('lightDirectionZ').value)
    gl.uniform3fv(shProgram.iLightDirection, [dirx, diry, dirz]);
    gl.uniform3fv(shProgram.iLightPosition, [posx, posy, posz]);
    gl.uniform1f(shProgram.iLimit, parseFloat(document.getElementById('limit').value));
    // gl.uniform1f(shProgram.iLimit, );
    gl.uniform1f(shProgram.iSmoothValue, parseFloat(document.getElementById('smoothValue').value));

    surface.Draw();
}

function CreateSurfaceData() {
    let vertexes = [];
    let normals = []

    let figure = (u, v) => {
        let phi = (-u / Math.sqrt(C + 1)) + Math.atan(Math.sqrt(C + 1) * Math.tan(u));
        let a = 2 / (C + 1 - (C * Math.pow(Math.sin(v), 2) * Math.pow(Math.cos(u), 2)));
        let r = (a / Math.sqrt(C)) * Math.sin(v) * Math.sqrt((C + 1) * (1 + C * Math.pow(Math.sin(u), 2)));
        return [r * Math.cos(phi),
        r * Math.sin(phi),
        (Math.log(Math.tan(v / 2)) + a * (C + 1) * Math.cos(v)) / Math.sqrt(C)]
    }

    const e = 0.0001
    let analytic = (u, v) => {
        let uv1 = figure(u, v)
        let u2 = figure(u + e, v)
        let v2 = figure(u, v + e)
        const dU = [(uv1[0] - u2[0]) / e, (uv1[1] - u2[1]) / e, (uv1[2] - u2[2]) / e]
        const dV = [(uv1[0] - v2[0]) / e, (uv1[1] - v2[1]) / e, (uv1[2] - u2[2]) / e]
        return m4.normalize(m4.cross(dU, dV))
    }

    vl = 0;
    for (let u = u1; u <= u2; u += uStep) {
        vs = 0;
        for (let v = v1; v <= v2; v += vStep) {
            vertexes.push(...figure(u, v))
            vertexes.push(...figure(u + uStep, v))
            vertexes.push(...figure(u, v + vStep))
            vertexes.push(...figure(u, v + vStep))
            vertexes.push(...figure(u + uStep, v))
            vertexes.push(...figure(u + uStep, v + vStep))
            normals.push(...analytic(u, v))
            normals.push(...analytic(u + uStep, v))
            normals.push(...analytic(u, v + vStep))
            normals.push(...analytic(u, v + vStep))
            normals.push(...analytic(u + uStep, v))
            normals.push(...analytic(u + uStep, v + vStep))
            vs++;
            vl++;
        }
    }

    // hl = 0;
    // for (let v = v1;   v <= v2;    v += vStep) {
    //     hs = 0;
    //     for (let u = u1;   u <= u2;  u += uStep) {
    //         let phi = (-u / Math.sqrt(C+1)) + Math.atan(Math.sqrt(C+1) * Math.tan(u));
    //         let a = 2 / (C + 1 - (C*Math.pow(Math.sin(v), 2) * Math.pow(Math.cos(u), 2)));
    //         let r = (a / Math.sqrt(C)) * Math.sin(v) * Math.sqrt((C + 1) * (1 + C*Math.pow(Math.sin(u), 2)));

    //         vertexes.push( r * Math.cos(phi),
    //             r * Math.sin(phi),
    //             (Math.log(Math.tan(v/2)) + a*(C+1)*Math.cos(v)) / Math.sqrt(C)
    //         );
    //         hs++;
    //         hl++;
    //     }
    // }

    return [vertexes, normals];
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLimit = gl.getUniformLocation(prog, "u_limit");
    shProgram.iLightDirection = gl.getUniformLocation(prog, "u_lightDirection");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "u_lightPosition");
    shProgram.iSmoothValue = gl.getUniformLocation(prog, "u_smoothValue");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    animate()
}

function animate() {
    draw()
    window.requestAnimationFrame(animate)
}
