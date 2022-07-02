let aa = ["1.0.4", "1.0.5", "1.1.0", "1.1.1"];
let bb = aa.sort((a, b) => b - a);

const cc =
  /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
    "a1_a1_b1"
  );
