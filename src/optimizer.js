export function optimize(node) {
  if (!node) return node;
  switch (node.type) {
    case "Binary": {
      node.left = optimize(node.left);
      node.right = optimize(node.right);
      if (node.left.type === "Num" && node.right.type === "Num") {
        switch (node.op) {
          case "+":
            return { type: "Num", value: node.left.value + node.right.value };
          case "-":
            return { type: "Num", value: node.left.value - node.right.value };
          case "*":
            return { type: "Num", value: node.left.value * node.right.value };
          case "/":
            return { type: "Num", value: node.left.value / node.right.value };
        }
      }
      return node;
    }
    default: return node;
  }
}