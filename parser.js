const css = require('css');

const EOF = Symbol("EOF");// EOF: (End Of File)用来标识文件结束标志，可以任意标识，因Symbol表示唯一，用字符可能会跟接收到的字符产生冲突

const layout = require("./layout.js")

let currentToken = null; // 记录当前产生的token对象
let currentAttribute = null; //记录当前产生的属性token对象

let stack = [{ type: "document", children: [] }]; // 构件根元素的父节点，方便获取整个dom树
let currentTextNode = null; //记录产生的文本节点


let rules = []; // 把CSS规则暂存到数组里面
function addCssRules(text) {
    var ast = css.parse(text);
    rules.push(...ast.stylesheet.rules);
}

// 选择器是否与当前元素上ID选择器、类选择器、标签选择器匹配,这里只考虑了简单场景
function match(element, selector) {
    if (!selector || !element.attributes) {
        return false;
    }
    // 是否与ID选择器匹配
    if (selector.charAt(0) === "#") {
        var attr = element.attributes.filter(attr => attr.name === 'id')[0];
        if (attr && attr.value === selector.replace("#", '')) {
            return true;
        }
        // 是否与类选择器匹配
    } else if (selector.charAt(0) === ".") {
        var attr = element.attributes.filter(attr => attr.name === "class")[0];
        if (attr && attr.value === selector.replace(".", "")) {
            return true;
        }
    } else {
        // 是否与标签选择器匹配
        if (element.tagName === selector) {
            return true;
        }
    }
    return false;
}

// css权重累计计算
function specificity(selector) {
    var p = [0, 0, 0, 0]; // 选择器优先级四元组【内联样式、ID选择器、类选择器、标签选择器】，优先级从高到低
    var selectorParts = selector.split(" ");
    for (var part of selectorParts) {
        if (part.charAt(0) === "#") {
            p[1] += 1;
        } else if (part.charAt(0) === ".") {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    }
    return p;
}

// css权重优先级计算，从高位开始一直计算到低位，高位算出结果就不管低位
function compare(sp1, sp2) {
    if (sp1[0] - sp2[0]) {
        return sp1[0] - sp2[0];
    }
    if (sp1[1] - sp2[1]) {
        return sp1[1] - sp2[1];
    }
    if (sp1[2] - sp2[2]) {
        return sp1[2] - sp2[2];
    }
    return sp1[3] - sp2[3];
}

function computeCSS(element) {
    // 这里elements中的元素肯定是element父元素父父元素等，因为此时element还没入栈
    var elements = stack.slice().reverse();// dom元素顺序是从内到外如：div>body>html>#document
    if (!element.computedStyle) {
        element.computedStyle = {};
    }
    for (let rule of rules) {
        var selectorParts = rule.selectors[0].split(" ").reverse(); // 如：[#myid,div,body]
        //当前dom元素与最近的css选择器不匹配则跳过
        if (!match(element, selectorParts[0])) {
            continue;
        }
        let matched = false;
        var j = 1; // 表示每个selector，从1开始是selectorParts中第0项与当前元素匹配，第1项开始才是和elements匹配，因为elements中元素不包含当前元素
        for (var i = 0; i < elements.length; i++) {
            if (match(elements[i], selectorParts[j])) {
                j++;
            }
        }
        // 此时复核css选择器是匹配当前元素的
        if (j >= selectorParts.length) {
            matched = true;
        }
        if (matched) {
            var sp = specificity(rule.selectors[0]);
            var computedStyle = element.computedStyle;
            for (var declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                if (!computedStyle[declaration.property].specificity) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                }

            }
        }

    }

    // let inlineStyle = element.attributes.filter(p => p.name === "style");
    // css.parse(`* {${inlineStyle}}`);

}

function emit(token) {
    let top = stack[stack.length - 1];
    if (token.type === "startTag") {
        let element = {
            type: "element",
            children: [],
            attributes: []
        }
        element.tagName = token.tagName;

        for (let p in token) {
            if (p !== "type" && p !== "tagName") {
                element.attributes.push({
                    name: p,
                    value: token[p]
                })
            }
        }

        computeCSS(element);

        top.children.push(element);
        element.parent = top;

        if (!token.isSelfClosing) {
            stack.push(element)
        }
        currentTextNode = null
    } else if (token.type === "endTag") {
        if (top.tagName !== token.tagName) {
            throw new Error("Tag start end doesn't match!")
        } else {
            // 遇到style标签时，执行添加css规则的操作
            if (top.tagName === "style") {
                addCssRules(top.children[0].content)
            }
            layout(top);
            stack.pop();
        }
        currentTextNode = null
    } else if (token.type === "text") {
        if (currentTextNode === null) {
            currentTextNode = {
                type: "text",
                content: ""
            }
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }

}

function data(c) {
    if (c === "<") {
        return tagOpen;
    } else if (c === EOF) {
        emit({
            type: "EOF"
        })
        return;
    } else {
        emit({
            type: "text",
            content: c
        })
        return data
    }
}
function tagOpen(c) {
    if (c === "/") {
        return endTagOpen;
    } else if (c.match(/^[a-zA-z]$/)) {
        currentToken = {
            type: "startTag",
            tagName: ""
        }
        return tagName(c);
    } else {
        return;
    }
}
function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: "endTag",
            tagName: ""
        }
        return tagName(c);
    } else if (c === ">") {

    } else if (c === EOF) {

    } else {

    }
}
function tagName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c;
        return tagName;
    } else if (c === ">") {
        emit(currentToken);
        return data;
    } else {
        return tagName;
    }
}
function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/" || c === ">" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {

    } else {
        currentAttribute = {
            name: "",
            value: ""
        }
        return attributeName(c);
    }
}
function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        return afterAttributeName(c);
    } else if (c === "=") {
        return beforeAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<") {

    } else {
        currentAttribute.name += c;
        return attributeName;
    }
}
function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        return beforeAttributeValue;
    } else if (c === "\"") {
        return doubleQuotedAttributeValue;
    } else if (c === "\'") {
        return singleQuotedAttributeValue;
    } else if (c === ">") {

    } else {
        return UnquotedAttributeValue(c);
    }
}
function afterAttributeName(char) {
    if (char.match(/^[\t\n\f ]$/)) {
        // 进入等待状态，等待读取下一个属性名
        return afterAttributeName;
    } else if (char === '/') {
        return selfClosingStartTag;
    } else if (char === '=') {
        return beforeAttributeValue;
    } else if (char === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        // 等待下一个处理的字符
        return data;
    } else if (char === EOF) {
    } else {
        // 收到一个普通字符，代表读取到了 属性，将当前属性保存
        currentToken[currentAttribute.name] = currentAttribute.value;
        // 新增一个属性
        currentAttribute = {
            name: '',
            value: '',
        };

        // 开始读取属性名
        return attributeName(char);
    }
}
function doubleQuotedAttributeValue(c) {
    if (c === "\"") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}
function singleQuotedAttributeValue(c) {
    if (c === "\'") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}
function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === "/") {
        return selfClosingStartTag;
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return doubleQuotedAttributeValue;
    }
}
function UnquotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttributeName;
    } else if (c === "/") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<" || c === "=" || c === "`") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c;
        return UnquotedAttributeValue
    }
}
function selfClosingStartTag(c) {
    if (c === ">") {
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    } else if (c === "EOF") {

    } else {

    }
}
module.exports.parserHTML = function parseHTML(html) {
    let state = data;
    for (let c of html) {
        state = state(c);
    }
    state = state(EOF);
    return stack[0];
}