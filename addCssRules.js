const css = require('css');


let rules = []; // 把CSS规则暂存到数组里面
module.exports.addCssRules = function (text) {
    var ast = css.parse(text);
    console.log(JSON.stringify(ast, null, "  "))
    rules.push(...ast.stylesheet.rules);
}  