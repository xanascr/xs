let _loc = null;
export function setLoc(loc) { _loc = loc; }

function loc() {
  const l = _loc;
  _loc = null;
  return l;
}

export const Program = body => ({ type: "Program", body, loc: loc() });
export const VarDecl = (id, init, typeHint) => ({ type: "VarDecl", id, init, typeHint, loc: loc() });
export const Assign = (left, right) => ({ type: "Assign", left, right, loc: loc() });
export const Binary = (op, left, right) => ({ type: "Binary", op, left, right, loc: loc() });
export const Unary = (op, arg) => ({ type: "Unary", op, arg, loc: loc() });
export const IfStmt = (test, cons, alt) => ({ type: "IfStmt", test, cons, alt, loc: loc() });
export const ForStmt = (init, test, update, body) => ({ type: "ForStmt", init, test, update, body, loc: loc() });
export const Block = body => ({ type: "Block", body, loc: loc() });
export const Call = (callee, args) => ({ type: "Call", callee, args, loc: loc() });
export const Member = (obj, prop) => ({ type: "Member", obj, prop, loc: loc() });
export const FunctionDecl = (name, params, body) => ({ type: "FunctionDecl", name, params, body, loc: loc() });
export const ReturnStmt = arg => ({ type: "ReturnStmt", arg, loc: loc() });
export const ExportStmt = name => ({ type: "ExportStmt", name, loc: loc() });
export const ImportExpr = path => ({ type: "ImportExpr", path, loc: loc() });
export const Ident = name => ({ type: "Ident", name, loc: loc() });
export const Num = value => ({ type: "Num", value, loc: loc() });
export const Str = value => ({ type: "Str", value, loc: loc() });
export const Bool = value => ({ type: "Bool", value, loc: loc() });
export const Nil = () => ({ type: "Nil", loc: loc() });
export const ArrayExpr = (items) => ({ type: "ArrayExpr", items, loc: loc() });
export const ObjectExpr = (props) => ({ type: "ObjectExpr", props, loc: loc() });
export const ArrowFunction = (params, body, isAsync = false) => ({ type: "ArrowFunction", params, body, isAsync, loc: loc() });
export const TryCatchStmt = (tryBlock, catchParam, catchBlock) => ({ type: "TryCatchStmt", tryBlock, catchParam, catchBlock, loc: loc() });
export const IndexExpr = (obj, index) => ({ type: "IndexExpr", obj, index, loc: loc() });
export const ImportStmt = (path, alias) => ({ type: "ImportStmt", path, alias, loc: loc() });
export const WhileStmt = (test, body) => ({ type: "WhileStmt", test, body, loc: loc() });
export const BreakStmt = () => ({ type: "BreakStmt", loc: loc() });
export const ContinueStmt = () => ({ type: "ContinueStmt", loc: loc() });
export const Ternary = (test, cons, alt) => ({ type: "Ternary", test, cons, alt, loc: loc() });

export const ClassDecl = (name, superClass, methods) => ({ type: "ClassDecl", name, superClass, methods, loc: loc() });
export const Method = (name, params, body, isConstructor) => ({ type: "Method", name, params, body, isConstructor, loc: loc() });
export const ThisExpr = () => ({ type: "ThisExpr", loc: loc() });
export const NewExpr = (callee, args) => ({ type: "NewExpr", callee, args, loc: loc() });

export const SwitchStmt = (test, cases) => ({ type: "SwitchStmt", test, cases, loc: loc() });
export const SwitchCase = (test, body) => ({ type: "SwitchCase", test, body, loc: loc() });

export const MatchExpr = (test, cases) => ({ type: "MatchExpr", test, cases, loc: loc() });
export const MatchCase = (pattern, body, guard) => ({ type: "MatchCase", pattern, body, guard, loc: loc() });
export const PatternLiteral = value => ({ type: "PatternLiteral", value, loc: loc() });
export const PatternIdent = name => ({ type: "PatternIdent", name, loc: loc() });
export const PatternArray = (elements) => ({ type: "PatternArray", elements, loc: loc() });
export const PatternObject = (props) => ({ type: "PatternObject", props, loc: loc() });
export const PatternRest = () => ({ type: "PatternRest", loc: loc() });
export const PatternGuard = (expr) => ({ type: "PatternGuard", expr, loc: loc() });

export const TestStmt = (name, body) => ({ type: "TestStmt", name, body, loc: loc() });
export const AssertStmt = (test, expected) => ({ type: "AssertStmt", test, expected, loc: loc() });

export const TaskDecl = (name, body) => ({ type: "TaskDecl", name, body, loc: loc() });

export const TableDecl = (name, props) => ({ type: "TableDecl", name, props, loc: loc() });
export const TableProp = (name, type) => ({ name, type, loc: loc() });

export const MacroDecl = (name, params, body) => ({ type: "MacroDecl", name, params, body, loc: loc() });
