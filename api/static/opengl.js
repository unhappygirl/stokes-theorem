const ORIGIN = [0, 0, 0];

const WHITE = [1.0, 1.0, 1.0, 1];
const BLACK = [0, 0, 0, 1];

function normalize(range, value) {
  let length = range[1] - range[0];
  let a = Math.abs(range[0]);
  return (value + a) / length;
}

// class too large, fix by extract subclass
class MyOpenGLController {
  constructor(canvas) {
    this.canvas = canvas;
    this.getContext();
    this.initShaderSrc();
    this.vertexShader = this.createShader(
      this.gl.VERTEX_SHADER,
      this.vertexShaderSource
    );
    this.fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      this.fragmentShaderSource
    );
    this.initProgram();
    this.initMatrices();
    this.initBuffers();
    this.initCamera();
  }

  getContext() {
    this.gl =
      this.canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!this.gl) {
      console.error("WebGL is not supported, try changing your browser");
    }
  }

  initShaderSrc() {
    this.vertexShaderSource = vertexShader;
    this.fragmentShaderSource = fragmentShader;
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Shader compilation failed:",
        this.gl.getShaderInfoLog(shader)
      );
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  initMatrices() {
    this.fieldOfView = (45 * Math.PI) / 180; // in radians
    this.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.zNear = 0.1;
    this.zFar = 200.0;

    this.projectionMatrix = mat4.create();
    mat4.perspective(
      this.projectionMatrix,
      this.fieldOfView,
      this.aspect,
      this.zNear,
      this.zFar
    );

    this.viewMatrix = mat4.create();
  }

  initProgram() {
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, this.vertexShader);
    this.gl.attachShader(this.program, this.fragmentShader);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "Program link failed:",
        this.gl.getProgramInfoLog(this.program)
      );
    }
    this.gl.useProgram(this.program);
  }

  initBuffers() {
    this.indexBuffer = this.gl.createBuffer();
    this.vertexBuffer = this.gl.createBuffer();
    this.normalBuffer = this.gl.createBuffer();
  }

  bufferArray(buffer, type, src, mode, arr_func) {
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, new arr_func(src), mode);
  }

  populateIndexBuffer(index_array) {
    this.bufferArray(
      this.indexBuffer,
      this.gl.ELEMENT_ARRAY_BUFFER,
      index_array,
      this.gl.STATIC_DRAW,
      Uint16Array
    );
  }

  populateNormalBuffer(normals_array) {
    this.bufferArray(
      this.normalBuffer,
      this.gl.ARRAY_BUFFER,
      normals_array,
      this.gl.STATIC_DRAW,
      Uint16Array
    );
  }

  initCamera() {
    this.cameraPos = [0, 0, 1 * 10]; // Camera position
    this.cameraTarget = [0, 0, 0]; // Target point (where the camera looks)
    this.cameraUp = [0, 11, 0]; // Up direction
  }

  buildView(pos, up, target = ORIGIN) {
    this.cameraPos = pos;
    this.cameraTarget = target;

    try {
      mat4.lookAt(this.viewMatrix, this.cameraPos, this.cameraTarget, up);
    } catch (error) {
      console.error("Error in mat4.lookAt:", error);
      throw error;
    }
  }

  checkProgram() {
    console.log("my Program:", this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error("Program link error:", this.gl.getProgramInfoLog(program));
    }

    const uProjectionMatrix = this.gl.getUniformLocation(
      this.program,
      "projectionMatrix"
    );
    const uViewMatrix = this.gl.getUniformLocation(this.program, "viewMatrix");

    if (!uProjectionMatrix || !uViewMatrix) {
      console.error("Error fetching uniform locations.");
    }
  }
  draw_elements(
    indices,
    mode,
    color,
    solid = true,
    lighting = false,
    normals = null
  ) {
    this.populateIndexBuffer(indices);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    const positionAttribLocation = this.gl.getAttribLocation(
      this.program,
      "position"
    );
    this.gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      this.gl.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.gl.enableVertexAttribArray(positionAttribLocation);

    const lloc = this.gl.getUniformLocation(this.program, "lighting");
    const useSCloc = this.gl.getUniformLocation(this.program, "useSolidColor");
    const colorLoc = this.gl.getUniformLocation(this.program, "objectColor");
    this.gl.uniform1i(lloc, lighting);
    this.gl.uniform1i(useSCloc, solid);

    if (lighting) {
      this.populateNormalBuffer(normals);
    }

    if (solid) {
      this.gl.uniform4fv(colorLoc, color);
    }

    this.gl.drawElements(mode, indices.length, this.gl.UNSIGNED_SHORT, 0);
  }

  draw_arrays(mode, color, elements) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    // make sure no ELEMENT_ARRAY_BUFFER is bound
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

    const positionAttribLocation = this.gl.getAttribLocation(
      this.program,
      "position"
    );
    this.gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      this.gl.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    this.gl.enableVertexAttribArray(positionAttribLocation);
    const useSCloc = this.gl.getUniformLocation(this.program, "useSolidColor");
    const colorLoc = this.gl.getUniformLocation(this.program, "objectColor");
    this.gl.uniform1i(useSCloc, true);
    this.gl.uniform4fv(colorLoc, color);

    this.gl.drawArrays(mode, 0, elements);
  }

  setupMatrices() {
    const projectionMatrixLocation = this.gl.getUniformLocation(
      this.program,
      "projectionMatrix"
    );
    this.gl.uniformMatrix4fv(
      projectionMatrixLocation,
      false,
      this.projectionMatrix
    );

    const viewMatrixLocation = this.gl.getUniformLocation(
      this.program,
      "viewMatrix"
    );
    this.gl.uniformMatrix4fv(viewMatrixLocation, false, this.viewMatrix);
    //
  }

  handle_inputs() {}

  render(drawing_routine) {
    this.setupMatrices();
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    if (drawing_routine instanceof Function) {
      drawing_routine(this);
    }
    requestAnimationFrame(() => this.render(drawing_routine));
  }

  mainloop(drawing_routine) {
    this.gl.clearColor(...WHITE);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    //this.gl.enable(this.gl.CULL_FACE);
    //this.gl.cullFace(this.gl.BACK);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.render(drawing_routine);
  }
}

class Drawer {
  constructor(openglController) {
    this.controller = openglController;
  }

  static tesellate_surface(samples) {
    const w = samples[0].length;
    const h = samples.length;
    const indices = [];
    for (let i = 0; i < h - 1; i++) {
      for (let j = 0; j < w - 1; j++) {
        const a = i * w + j;
        const b = a + 1;
        const c = a + w;
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    return { vertices: samples.flat().flat(), indices: indices };
  }

  draw_param_surface(samples) {
    const data = Drawer.tesellate_surface(samples);
    this.controller.bufferArray(
      this.controller.vertexBuffer,
      this.controller.gl.ARRAY_BUFFER,
      data.vertices,
      this.controller.gl.STATIC_DRAW,
      Float32Array
    );
    this.controller.draw_elements(
      data.indices,
      this.controller.gl.TRIANGLES,
      null,
      false
    );
  }

  draw_lines(vectors, color) {
    const flat = vectors.flat();
    this.controller.bufferArray(
      this.controller.vertexBuffer,
      this.controller.gl.ARRAY_BUFFER,
      flat.flat(),
      this.controller.gl.STATIC_DRAW,
      Float32Array
    );

    this.controller.draw_arrays(
      this.controller.gl.LINES,
      color,
      vectors.length * 2
    );
  }

  draw_tips(vectors, pw, ph, color, interp = false) {
    const indices = [2, 1, 4, 2, 3, 4, 2, 3, 0, 2, 1, 0, 1, 4, 0, 4, 3, 0];
    //construct the vertices
    let vertices = [];
    for (const vec of vectors) {
      vertices.push(...pyramid_vertices(vec, pw, ph));
    }
    this.controller.bufferArray(
      this.controller.vertexBuffer,
      this.controller.gl.ARRAY_BUFFER,
      vertices.flat(),
      this.controller.gl.STATIC_DRAW,
      Float32Array
    );
    //construct the indices
    let pyramidIndices = [];
    for (const i in vectors) {
      pyramidIndices.push(...indices.map((x) => x + i * 5));
    }
    this.controller.draw_elements(
      pyramidIndices,
      this.controller.gl.TRIANGLES,
      color,
      !interp
    );
  }

  draw_axes() {
    const axes = [
      [[-50, 0, 0],
      [50, 0, 0]],
      [[0, -50, 0],
      [0, 50, 0]],
      [[0, 0, -50],
      [0, 0, 50]],
    ];
    this.draw_vectors(axes, [0.8, 0.8, 0.8, 1]);
  }

  draw_vectors(vectors, color, interp = false, w=0.25, h=0.25) {
    this.draw_lines(vectors, color);
    this.draw_tips(vectors, w, h, color, interp);
  }

  draw_points(points, color) {
    this.controller.bufferArray(
      this.controller.vertexBuffer,
      this.controller.gl.ARRAY_BUFFER,
      points.flat(),
      this.controller.gl.STATIC_DRAW,
      Float32Array
    );
    this.controller.draw_arrays(
      this.controller.gl.POINTS,
      color,
      points.length
    );
  }
}
