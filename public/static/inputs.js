
var MQ = MathQuill.getInterface(2); // for backcompat (?)

var xDelta = 0;
var yDelta = 0;

let xOld = 0;
let yOld = 0;

const canvas = document.getElementById("plotCanvas");

function onMouseDown(_event) {
  canvas.style.cursor = "grabbing";
}

function onMouseMove(event) {
  if (canvas.style.cursor !== "grabbing") {
    xOld = event.clientX;
    yOld = event.clientY;
    return;
  }
  xDelta = -(event.clientX - xOld);
  yDelta = event.clientY - yOld;
  xOld = event.clientX;
  yOld = event.clientY;
  // Scale the deltas to a reasonable value
  xDelta *= 0.005;
  yDelta *= 0.005;
}

function onMouseScroll(event) {
  //console.log(event.deltaY);
}

function onMouseUp(_event) {
  xDelta = 0;
  yDelta = 0;
  canvas.style.cursor = "grab";
}

function addDragListeners() {
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("wheel", onMouseScroll);
  //canvas.addEventListener("touchstart", onTouchStart);
  //canvas.addEventListener("touchmove", onTouchMove);
  //canvas.addEventListener("touchend", onTouchEnd);
}

function getVisualInputsRaw(cmfx, cmfy, cmfz, fmfx, fmfy, fmfz) {
  const curve = {
    x: cmfx.latex(),
    y: cmfy.latex(),
    z: cmfz.latex(),
  };
  const field = {
    x: fmfx.latex(),
    y: fmfy.latex(),
    z: fmfz.latex(),
  };
  return {
    curve: curve,
    field: field,
  };
}

function getZoom() {
  zoom = document.getElementById("zoomRange").value;
  zoom = parseFloat(zoom);
  if (isNaN(zoom) || zoom <= 0) {
    zoom = 1.0; // Default zoom value
  }
  return zoom;
}

function testInputs(curve, field) {
  curve.x(0, 0);
  curve.y(0, 0);
  curve.z(0, 0);
  field.x(0, 0, 0);
  field.y(0, 0, 0);
  field.z(0, 0, 0);
}

function getFunctions(mathFields) {
  const data = getVisualInputsRaw(...mathFields);
  const curve_str = data.curve;
  const field_str = data.field;
  const rx = evaluatex(curve_str.x);
  const ry = evaluatex(curve_str.y);
  const rz = evaluatex(curve_str.z);

  const fx = evaluatex(field_str.x);
  const fy = evaluatex(field_str.y);
  const fz = evaluatex(field_str.z);
  
  const curve = {x: (u, v) => rx({u: u, v: v}),
                 y: (u, v) => ry({u: u, v: v}),
                 z: (u, v) => rz({u: u, v: v})};
  const field = {x: (x, y, z) => fx({x: x, y: y, z: z}),
                 y: (x, y, z) => fy({x: x, y: y, z: z}),
                 z: (x, y, z) => fz({x: x, y: y, z: z})};
  testInputs(curve, field);
  return {
    curve: curve,
    field: field,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateEquations(rhs, lhs, mathFields) {
  const inputs = getVisualInputsRaw(...mathFields);
  const eq = document.getElementById("equation");

  // Get field components as strings
  const Fx = inputs.field.x;
  const Fy = inputs.field.y;
  const Fz = inputs.field.z;

  const fieldStr = `\\begin{pmatrix}${math.parse(Fx).toTex()} \\\\ ${math
    .parse(Fy)
    .toTex()} \\\\ ${math.parse(Fz).toTex()}\\end{pmatrix}`;

  // Inject equations with symbolic field and curl
  eq.innerHTML = `
    \\[
      \\displaystyle 
      \\iint _{\\Sigma }(\\nabla \\times ${fieldStr})\\cdot d\\vec{S} 
      = ${lhs}
    \\]
    \\[
      \\displaystyle 
      \\oint _{\\partial \\Sigma }${fieldStr} \\cdot d\\vec{\\Gamma} 
      = ${rhs}
    \\]
  `;

  MathJax.typeset([eq]);
}

addDragListeners();
