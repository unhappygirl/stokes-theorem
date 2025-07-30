class MainController {
  constructor(surface, field) {
    this.canvas = document.getElementById("plotCanvas");
    this.surface = surface;
    this.field = field;
    this.openglController = new MyOpenGLController(this.canvas);
    this.openglController.buildView(this.openglController.cameraPos, [0, 1, 0]);
    this.radius = 30;
    this.openglController.checkProgram();
    this.openglController.setupMatrices();
    this.drawer = new Drawer(this.openglController);
    this.vectors = [];
    this.points = [];
    this.uv_ranges = [
      [-4, 4],
      [-4, 4],
    ];
    this.cameraAngles = [0, 0];
    this.init_mathquill();
  }

  init_MathField(id) {
      const element = document.getElementById(id); 
      const callback = this.change_visuals.bind(this);
      
      return MQ.MathField(element, {
        handlers: {
          edit: function () {
            callback();
          },
        },
      });
  }

  init_mathquill() {
    
    // Initialize MathQuill fields
    const cmfx = this.init_MathField("par_x");
    const cmfy = this.init_MathField("par_y");
    const cmfz = this.init_MathField("par_z");
    const cmvx = this.init_MathField("vec_x");
    const cmvy = this.init_MathField("vec_y");
    const cmvz = this.init_MathField("vec_z");
    this.mathFields = [cmfx, cmfy, cmfz, cmvx, cmvy, cmvz];
  }

  handle_inputs_error() {
    try {
      const inputs = getFunctions(this.mathFields);
      return inputs;
    } catch (error) {
      console.error("Error getting inputs:", error);
      return false;
    }
  }

  handle_mouse_inputs() {
    this.set_zoom(getZoom());
    this.cameraAngles[0] += xDelta;
    this.cameraAngles[1] += yDelta;
    const [a, b] = this.cameraAngles;
    this.openglController.cameraPos = [
      this.radius * Math.sin(a) * Math.cos(b),
      this.radius * Math.sin(b),
      this.radius * Math.cos(a) * Math.cos(b),
    ];

    this.openglController.buildView(this.openglController.cameraPos, [0, 1, 0]);
  }

  set_zoom(zoom) {
    this.radius = 60 - zoom;
  }

  handle_visual_inputs() {
    const inputs = this.handle_inputs_error();
    if (!inputs) {
      console.warn("Error in inputs, using previous values.");
      return false;
    }
    this.surface = new ParametricSurface(
      inputs.curve.x,
      inputs.curve.y,
      inputs.curve.z
    );
    this.field = new Field(inputs.field.x, inputs.field.y, inputs.field.z);
    return true;
  }

  sample() {
    this.points = this.surface.sample(this.uv_ranges, 0.1);
    this.vectors = this.field.sample([-20, 20], 0.2, 0.04);
  }

  calculate_stokes() {
    const data = this.surface.curl_integral(this.field, this.uv_ranges, 0.2);
    this.normals = data.norms;
    const lhs = data.int;
    this.bcurve = this.surface.boundary_curve(this.uv_ranges, 0.02);
    const rhs = this.surface.boundary_integral(this.field, this.bcurve);
    return [rhs, lhs];
  }

  draw_all() {
    this.drawer.draw_axes();
    this.drawer.draw_param_surface(this.points);
    this.drawer.draw_vectors(this.vectors, [0, 0, 0, 0.8], false);
    this.drawer.draw_vectors(
      this.normals,
      [0.4, 0.4, 0.7, 0.7],
      false,
      0.15,
      0.15
    );
    this.drawer.draw_points(this.bcurve, [1, 0, 0, 1]);
  }

  change_visuals() {
    console.log("change visuals called");
    this.handle_visual_inputs();
    this.sample();
    const [rhs, lhs] = this.calculate_stokes();
    updateEquations(rhs, lhs, this.mathFields);
  }

  mainloop() {
    this.change_visuals(); //initial call to set up the scene
    this.openglController.mainloop((this_glcontroller) => {
      //this.handle_inputs();
      this_glcontroller.buildView(this_glcontroller.cameraPos, [0, 1, 0]);
      this.handle_mouse_inputs();
      this.draw_all();
    });
  }
}

function transform_function(lambda) {
  return math.simplify(lambda.toString().split("=>")[1].trim());
}

function mock_init() {
  const field = new Field(
    (x, y, z) => x,
    (x, y, z) => y + z,
    (x, y, z) => z
  );
  const surface = new ParametricSurface(
    (u, v) => 3 * Math.sin(v),
    (u, v) => (8 + 3 * Math.cos(v)) * Math.sin(u),
    (u, v) => (8 + 3 * Math.cos(v)) * Math.cos(u)
  );
  document.getElementById("par_x").textContent = transform_function(surface.Rx);
  document.getElementById("par_y").textContent = transform_function(surface.Ry);
  document.getElementById("par_z").textContent = transform_function(surface.Rz);
  document.getElementById("vec_x").textContent = transform_function(field.Fx);
  document.getElementById("vec_y").textContent = transform_function(field.Fy);
  document.getElementById("vec_z").textContent = transform_function(field.Fz);
  return { surface, field };
}

function main() {
  const { surface, field } = mock_init();
  const controller = new MainController(surface, field);
  controller.mainloop();
}

main();
