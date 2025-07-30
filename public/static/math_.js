const eps = Number.EPSILON * 120;

const BASIS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function round_to(n, decimals = 1) {
  return Number(Math.round(n + "e" + decimals) + "e-" + decimals);
}

function scale(l, scaler) {
  l.forEach((e, i) => {
    l[i] = e * scaler;
  });
}

function pyramid_vertices(vec, pw, ph) {
  let [start, tip] = vec;
  start = math.matrix(start);
  tip = math.matrix(tip);
  const dir = math.subtract(tip, start);
  const e1 = math.divide(dir, math.norm(dir));
  const e2 = math.matrix([-e1.get([1]), e1.get([0]), 0]);
  const e3 = math.cross(e1, e2);
  let vertices = [
    math.add(tip, math.multiply(e1, ph)),
    math.add(
      tip,
      math.add(math.multiply(e3, pw / 2), math.multiply(e2, -pw / 2))
    ),
    math.add(
      tip,
      math.add(math.multiply(e3, -pw / 2), math.multiply(e2, -pw / 2))
    ),
    math.add(
      tip,
      math.add(math.multiply(e3, -pw / 2), math.multiply(e2, pw / 2))
    ),
    math.add(
      tip,
      math.add(math.multiply(e3, pw / 2), math.multiply(e2, pw / 2))
    ),
  ];
  vertices = vertices.map((e) => e.toArray());
  return vertices.flat();
}

function derivative(f, n) {
  return (f(n + eps) - f(n)) / n;
}

function partial_derivative(f, n, var_index) {
  const p0 = n.slice();
  let p1 = n.slice();
  p1[var_index] += eps;
  return (math.divide( math.subtract(f(...p1), f(...p0)), eps));
}

function sample_cubic_space(range, sample_rate) {
  let points = [];
  for (let x = range[0]; x <= range[1]; x += sample_rate) {
    for (let y = range[0]; y <= range[1]; y += sample_rate) {
      for (let z = range[0]; z <= range[1]; z += sample_rate) {
        points.push([x, y, z]);
      }
    }
  }
  return points;
}

// a vector field
class Field {
  constructor(Fx, Fy, Fz) {
    this.Fx = Fx;
    this.Fy = Fy;
    this.Fz = Fz;
    this.cfunc = (x, y, z) => [Fx(x, y, z), Fy(x, y, z), Fz(x, y, z)];
  }

  get_vector(x, y, z, scaler = 1) {
    let vec = this.cfunc(x, y, z);
    scale(vec, scaler);
    return vec;
  }

  get_curl(x, y, z) {
    const point = [x, y, z];
    const curl_x =
      partial_derivative(this.Fz, point, 1) -
      partial_derivative(this.Fy, point, 2);
    const curl_y =
      partial_derivative(this.Fx, point, 2) -
      partial_derivative(this.Fz, point, 0);
    const curl_z =
      partial_derivative(this.Fy, point, 0) -
      partial_derivative(this.Fx, point, 1);

    return [curl_x, curl_y, curl_z];
  }

  get_divergence(x, y, z) {
    return this.Fx(x) + this.Fy(y) + this.Fz(z);
  }

  sample(range, density, scaler = 1) {
    // sample rate
    const sr = 1 / density;
    //
    let vectors = [];
    for (const point of sample_cubic_space(range, sr)) {
      let [x, y, z] = point;
      const vector = this.get_vector(x, y, z, scaler);
      vectors.push([point, math.add(point, vector)]);
    }
    return vectors;
  }
}

class ParametricSurface {
  constructor(Rx, Ry, Rz) {
    this.Rx = Rx;
    this.Ry = Ry;
    this.Rz = Rz;
    this.cfunc = (u, v) => [Rx(u, v), Ry(u, v), Rz(u, v)];
  }

  sample(uv_ranges, sample_rate) {
    let samples = [];
    let [ur, vr] = uv_ranges;
    let i = 0;
    for (let u = ur[0]; u <= ur[1]; u += sample_rate) {
      samples[i] = [];
      for (let v = vr[0]; v <= vr[1]; v += sample_rate) {
        // make sure u and v are stable
        u = round_to(u, 2);
        v = round_to(v, 2);
        //
        samples[i].push(this.cfunc(u, v));
      }
      i += 1;
    }
    return samples;
  }

  boundary_curve(uv_ranges, sample_rate) {
    //            s1
    //    ------>---------->---
    //   |                     |
    //   ^                     ↓
    //s4 |                     | s2
    //   ^                     ↓
    //   |                     |
    //   |                     |
    //    -------<-------<-----
    //            s3

    let s1 = [],
      s2 = [],
      s3 = [],
      s4 = [];
    let [ur, vr] = uv_ranges;
    for (let u = ur[0]; u <= ur[1]; u += sample_rate) {
      s1.push(this.cfunc(u, vr[0]));
      s3.unshift(this.cfunc(u, vr[1]));
    }
    for (let v = vr[0]; v <= vr[1]; v += sample_rate) {
      s2.push(this.cfunc(ur[1], v));
      s4.unshift(this.cfunc(ur[0], v));
    }
    return [...s1, ...s2, ...s3, ...s4];
  }

  boundary_integral(field, bcurve) {
    let vi, vn;
    let integral = 0;
    for (let i = 0; i < bcurve.length - 1; i++) {
      vi = bcurve[i];
      vn = bcurve[(i + 1) % bcurve.length];
      const tangent = math.subtract(vn, vi);
      const vec = field.get_vector(...vi);
      const d = math.dot(vec, tangent);
      integral += d;
    }
    return integral;
  }

  normal_at(u, v) {
    const du = partial_derivative(this.cfunc, [u, v], 0);
    const dv = partial_derivative(this.cfunc, [u, v], 1);
    const normal = math.cross(du, dv);
    return normal;
  }

  curl_integral(field, uv_ranges, sample_rate = 0.1) {
    let integral = 0;
    let normals = [];
    const [ur, vr] = uv_ranges;
    let cartesian;
    for (let u = ur[0]; u < ur[1]; u += sample_rate) {
      for (let v = vr[0]; v < vr[1]; v += sample_rate) {
        cartesian = this.cfunc(u + sample_rate / 2, v + sample_rate / 2);
        const curl = field.get_curl(...cartesian);
        const normal = this.normal_at(u, v);
        normals.push([
          cartesian,
          math.add(cartesian, math.divide(normal, math.norm(normal)*2)),
        ]);
        const flux = math.dot(curl, normal);
        integral += flux * sample_rate * sample_rate;
      }
    }
    return { int: integral, norms: normals };
  }
}
