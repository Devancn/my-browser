// 元素上新增style属性，该属性值来源computedStyle属性处理后的值
function getStyle(element) {
    if (!element.style) {
        element.style = {};
    }
    for (let prop in element.computedStyle) {
        element.style[prop] = element.computedStyle[prop].value;

        if (element.style[prop].toString().match(/px$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }
        if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }
    }
    return element.style;
}

function layout(element) {
    if (!element.computedStyle) {
        return;
    }
    var elementStyle = getStyle(element);

    if (elementStyle.display !== "flex") {
        return
    }

    var items = element.children.filter(e => e.type === "element");

    items.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
    })

    var style = elementStyle;

    // 一下是对于没有指定属性或者为auto的设置默认值
    ['width', 'height'].forEach(size => {
        if (style[size] === 'auto' || style[size] === '') {
            style[size] = null;
        }
    })


    /**
     * 给当前元素设置以下默认值
     * flex-direction、align-items、justifyu-content、flex-wrap、align-content
     */
    if (!style.flexDirection || style.flexDirection === "auto") {
        style.flexDirection = 'row';
    }
    if (!style.alignItems || style.alignItems === "auto") {
        style.alignItems = 'stretch';
    }
    if (!style.justifyContent || style.justifyContent === "auto") {
        style.justifyContent = 'flex-start';
    }
    if (!style.flexWrap || style.flexWrap === 'auto') {
        style.flexWrap = 'nowrap';
    }
    if (!style.alignContent || style.alignContent === 'auto') {
        style.alignContent = 'stretch';
    }


    /**
     * main开头的为主轴相关
     * cross为交叉轴相关
     * size表示大小如width、height属性
     * start表示元素排列起始位置，从start方向开始排列
     * end表示元素排列结束位置，往end方向排列
     * sign：表示向右排列还是向左排列正1(+1)表示向右排列,负1(-1)表示向左排列
     * base： 元素排列的起始位置值
     */
    var mainSize, mainStart, mainEnd, mainSign, mainBase,
        crossSize, crossStart, crossEnd, crossSign, crossBase;

    if (style.flexDirection === 'row') {
        mainSize = 'width';
        mainStart = 'left';
        mainEnd = 'right';
        mainSign = +1;
        mainBase = 0;

        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    }

    if (style.flexDirection === 'row-reverse') {
        mainSize = 'width';
        mainStart = 'right';
        mainEnd = 'left';
        mainSign = -1; 
        mainBase = style.width;

        crossSize = 'height';
        crossStart = 'top';
        crossEnd = 'bottom';
    }

    if (style.flexDirection === 'column') {
        mainSize = 'height';
        mainStart = 'top';
        mainEnd = 'bottom';
        mainSign = +1;
        mainBase = 0;

        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    }

    if (style.flexDirection === 'column-reverse') {
        mainSize = 'height';
        mainStart = 'bottom';
        mainEnd = 'top';
        mainSign = -1;
        mainBase = style.height;

        crossSize = 'width';
        crossStart = 'left';
        crossEnd = 'right';
    }

    if (style.flexWrap === 'wrap-reverse') {
        var tmp = crossStart;
        crossStart = crossEnd;
        crossEnd = tmp;
        crossSign = -1;
    } else {
        crossBase = 0;
        crossSign = +1;
    }
    

    var isAutoMainSize = false; // 主轴上的size(width/height)是否为自动，没有设置size
    if (!style[mainSize]) {
        elementStyle[mainSize] = 0;
        for (var i = 0; i < items.length; i++) {
            var itemStyle = getStyle(items[i]);
             // 如果子元素有设置size,element元素容器的主轴size为子元素有设置size累计之和，
            if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
                elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize];
            }
        }
        isAutoMainSize = true;
    }

    var flexLine = []; // 存放flex容器中一行中的每个元素
    var flexLines = [flexLine];// 存放flex容器中以行分组的每组元素

    var mainSpace = elementStyle[mainSize]; // 主轴剩余空间，初始一个子元素没有，所以size为element元素size
    var crossSpace = 0;// 初始交叉轴容器剩余空间

    // items为子元素
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemStyle = getStyle(item);

        // 如果子元素没有设置size则为0
        if (itemStyle[mainSize] === null) {
            itemStyle[mainSize] = 0;
        }

        // 如果设置了flex属性，则只会全部排列成一行，按照flex值进行比例放置
        if (itemStyle.flex) {
            flexLine.push(item);
        } else if (style.flexWrap === 'nowrap' && isAutoMainSize) { // nowrap子元素会单行排列
            mainSpace -= itemStyle[mainSize];
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
            }
            flexLine.push(item);
        } else {
            // 子元素主轴size大于容器size
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize] = style[mainSize]
            }
            // 如果剩余空间小于当前子元素的大小，不够放置子元素
            // 则需要把mainSpace与crossSpace存放起来
            // 并重置flexLine，push到flexLines，设置默认mainSpace与容器mainSize，crossSpace为0
            if (mainSpace < itemStyle[mainSize]) {
                flexLine.mainSpace = mainSpace;
                flexLine.crossSpace = crossSpace;
                // 重置flexLine盒子并把当前子元素放入
                flexLine = [item];
                // flexLines放入flexLine盒子
                flexLines.push(flexLine);
                // 重置主轴空间为element元素mainSize
                mainSpace = style[mainSize];
                // 重置交叉轴剩余空间为0
                crossSpace = 0;
            } else {
                flexLine.push(item);
            }
            //如果交叉有上的crossSize有设置，则与当前crossSpace比较取最大值
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
            }
            // 剩余空间减去当前元素mainSize
            mainSpace -= itemStyle[mainSize];
        }
    }
    flexLine.mainSpace = mainSpace; // 记录当前行的剩余空间

    if (style.flexWrap === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (style[crossSize] !== undefined ? style[crossSize] : crossSpace)
    } else {
        flexLine.crossSpace = crossSpace;
    }

    // 剩余空间为负数情况
    if (mainSpace < 0) {
        // 缩放比例为 element元素目标mainSize / 实际mainSize
        var scale = style[mainSize] / (style[mainSize] - mainSpace); // 这里的scale肯定小于1
        var currentMain = mainBase;
        for (var i = 0; i < items.length; i++) {
            var itemStyle = getStyle(items[i]);

            if (itemStyle.flex) {
                itemStyle[mainSize] = 0;
            }

            itemStyle[mainSize] = itemStyle[mainSize] * scale;

            itemStyle[mainStart] = currentMain;
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
            currentMain = itemStyle[mainEnd];
        }
    } else {
        
        flexLines.forEach(items => {
            var mainSpace = items.mainSpace;
            var flexTotal = 0;
            for (var i = 0; i < items.length; i++) {
                var itemStyle = getStyle(items[i]);

                if ((itemStyle.flex !== null) && itemStyle.flex !== void 0) {
                    flexTotal += itemStyle.flex;
                }
            }

            if (flexTotal > 0) {
                var currentMain = mainBase;
                for (var i = 0; i < items.length; i++) {
                    var itemStyle = getStyle(items[i]);

                    if (itemStyle.flex) {
                        itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
                    }
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainEnd];
                }
            } else {
                if (style.justifyContent === 'flex-start') {
                    var currentMain = mainBase;
                    var gap = 0;
                }
                if (style.justifyContent === 'flex-end') {
                    // 元素的起始位置为 mainSpace + mainBase
                    var currentMain = mainSpace * mainSign + mainBase;
                    var gap = 0;
                }
                if (style.justifyContent === 'center') {
                    var currentMain = mainSpace / 2 * mainSign + mainBase;
                    var gap = 0;
                }
                if (style.justifyContent === 'space-between') {
                    var gap = mainSpace / (items.length - 1) * mainSign;
                    var currentMain = mainBase;
                }
                if (style.justifyContent === 'space-around') {
                    var gap = mainSpace / items.length * mainSign; // 元素之间的空白
                    var currentMain = gap / 2 + mainBase;
                }
                for (var i = 0; i < items.length; i++) {
                    itemStyle[mainStart] = currentMain;
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
                    currentMain = itemStyle[mainEnd] + gap;
                }
            }
        })
    }

    // 交叉轴
    var crossSpace;
    if (!style[crossSize]) {
        crossSpace = 0;
        elementStyle[crossSize] = 0;
        for (var i = 0; i < flexLines.length; i++) {
            elementStyle[crossSize] = elementStyle[crossSize] + flexLines[i].crossSpace;
        }
    } else {
        crossSpace = style[crossSize];
        for (var i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace;
        }
    }

    if (style.flexWrap === 'wrap-reverse') {
        crossBase = style[crossSize];
    } else {
        crossBase = 0;
    }
    var lineSize = style[crossSize] / flexLines.length;

    var gap;
    if (style.alignContent === 'flex-start') {
        crossBase += 0;
        gap = 0;
    }
    if (style.alignContent === 'flex-end') {
        crossBase += crossSign * crossSpace;
        gap = 0;
    }
    if (style.alignContent === 'center') {
        crossBase += crossSign * crossSpace / 2;
        gap = 0;
    }
    if (style.alignContent === 'space-between') {
        crossBase += 0;
        gap = crossSpace / (flexLines.length - 1);
    }
    if (style.alignContent === 'space-around') {
        gap = crossSpace / (flexLines.length);
        crossBase += crossSign * step / 2;
    }
    if (style.alignContent === 'stretch') {
        crossBase += 0;
        gap = 0;
    }
    flexLines.forEach(items => {
        var lineCrossSize = style.alignContent === 'stretch' ?
            items.crossSpace + crossSpace / flexLines.length :
            item.crossSpace;
        for (var i = 0; i < items.length; i++) {
            var itemStyle = getStyle(items[i]);

            var align = itemStyle.alignSelf || style.alignItems;

            if (itemStyle[crossSize] === null) {
                itemStyle[crossSize] = (align === 'stretch') ?
                    lineCrossSize : 0;
            }

            if (align === 'flex-start') {
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = itemStyle[crossStart]
            }

            if (align === 'flex-end') {
                itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
                itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
            }

            if (align === 'center') {
                itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2;
                itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
            }

            if (align === 'stretch') {
                itemStyle[crossStart] = crossBase;
                itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize]) !== null && (itemStyle[crossSize]) !== void 0 ? itemStyle[crossSize] : lineCrossSize)
                itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
            }
        }
        crossBase += crossSign * (lineCrossSize + gap);
    })
    console.log(items);
}

module.exports = layout;