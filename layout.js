// 元素上新增style属性，该属性值来源computedStyle属性处理后的值
function getStyle(element) {
  if (!element.style) {
    element.style = {};
  }
  for (let prop in element.computedStyle) {
    //  把 computedStyle 属性的value 直接根据 prop 依次赋值给 element.style对象
    element.style[prop] = element.computedStyle[prop].value;

    // 处理带 px 属性的值 变成数字，利于后序排版计算
    if (element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
    // 如果数字也进行 pareInt 转成数字
    if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }
  return element.style;
}

function layout(element) {
  // 如果 element 元素没有 style 就直接 return 停止往后执行
  if (!element.computedStyle) {
    return;
  }
  // 这里对元素的 style 进行预处理
  var elementStyle = getStyle(element);

  // 这里只处理 flex 元素， 否则不进行 layout
  if (elementStyle.display !== "flex") {
    return;
  }

  // 如果 该flex 元素的 children 不是 element 节点这排除，比如 文本节点，只针对元素进行排版布局
  var items = element.children.filter((e) => e.type === "element");

  //   把元素根据 order 进行排序处理
  items.sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });

  var style = elementStyle;

  // 一下是对于没有指定属性或者为auto的设置默认值
  ["width", "height"].forEach((size) => {
    //   对 width、height 预处理，利于后面对这些属性好进行判断
    if (style[size] === "auto" || style[size] === "") {
      style[size] = null;
    }
  });

  /**
   * 对 style 的属性值做默认值处理
   * flex-direction、align-items、justifyu-content、flex-wrap、align-content
   */
  //   flex-direction属性默认值为 row，制定了内部元素如何在flex 容器中布局，定义了主轴方向
  if (!style.flexDirection || style.flexDirection === "auto") {
    style.flexDirection = "row";
  }
  //该属性将所有直接子节点上的align-self值设置为一个组。设置子节点在 flex容器中交叉轴方向上的堆砌方式
  if (!style.alignItems || style.alignItems === "auto") {
    style.alignItems = "stretch";
  }
  /**
   * 该属性定义flex 容器主轴的元素之间及其周围的空间
   */
  if (!style.justifyContent || style.justifyContent === "auto") {
    style.justifyContent = "flex-start";
  }
  /**
   * 该属性指定 flex 元素单行显示还是多行显示。
   */
  if (!style.flexWrap || style.flexWrap === "auto") {
    style.flexWrap = "nowrap";
  }
  /**
   * 该属性值在 flex-wrap不为nowrap时，也就是对单行flex盒子无效，设置如何沿着flex的纵轴在内容
   * 项之间和周围分配空间
   */
  if (!style.alignContent || style.alignContent === "auto") {
    style.alignContent = "stretch";
  }

  /**
   * size,start,end,sign,base表示元素排版时的一些抽象声明
   * size值可能是width与height
   * 如果size是size，元素排版从左往右，则start为left，end为right，元素从右往左排版则start为right,end为left
   * base表示元素排版的起点，如果元素从左往右排版，则base为0，从右往左排版则base为元素宽度的值
   * sign表示元素的排布方向，如果sign（+1）为正，表示在base基础上增加，如果从右往左排，sign（-1）则为负，在base的基础上减
   */
  var mainSize,
    mainStart,
    mainEnd,
    mainSign,
    mainBase,
    crossSize,
    crossStart,
    crossEnd,
    crossSign,
    crossBase;

  // 根据 flex-direction 的值 设置主轴与交叉轴对应变量的值
  // 从左往右
  if (style.flexDirection === "row") {
    mainSize = "width";
    mainStart = "left";
    mainEnd = "right";
    // 表示从左往右排版，
    mainSign = +1;
    mainBase = 0;

    crossSize = "height";
    crossStart = "top";
    crossEnd = "bottom";
  }

  //   从右往左
  if (style.flexDirection === "row-reverse") {
    mainSize = "width";
    mainStart = "right";
    mainEnd = "left";
    mainSign = -1;
    mainBase = style.width;

    crossSize = "height";
    crossStart = "top";
    crossEnd = "bottom";
  }

  //   从上往下
  if (style.flexDirection === "column") {
    mainSize = "height";
    mainStart = "top";
    mainEnd = "bottom";
    mainSign = +1;
    mainBase = 0;

    crossSize = "width";
    crossStart = "left";
    crossEnd = "right";
  }

  // 从下往上
  if (style.flexDirection === "column-reverse") {
    mainSize = "height";
    mainStart = "bottom";
    mainEnd = "top";
    mainSign = -1;
    mainBase = style.height;

    crossSize = "width";
    crossStart = "left";
    crossEnd = "right";
  }

  //   交叉轴上的cross-start 与 cross-end 互换
  if (style.flexWrap === "wrap-reverse") {
    var tmp = crossStart;
    crossStart = crossEnd;
    crossEnd = tmp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = +1;
  }

  // 主轴上的size(width/height)是否有设置，没有则自动撑开，此时mainSize的大小为所有子元素的总和
  var isAutoMainSize = false;
  if (!style[mainSize]) {
    //   设置元素的mainSize 属性 大小为0
    elementStyle[mainSize] = 0;
    // 元素的mainSize大小为子元素的mainSize属性值得总和
    for (var i = 0; i < items.length; i++) {
      // 计算子元素的style样式
      var itemStyle = getStyle(items[i]);
      //  如果子元素的mainSize有值，则对flex的mainSize进行累加
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== void 0) {
        elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize];
      }
    }
    // 表示flex的mainSize为元素自动累加，不是设置的值
    isAutoMainSize = true;
  }

  /**
   * flexLine表示单行排列的元素
   * flexLines表示该flex容器中多少行
   * flexLines的length表示flex换了多少行
   */
  var flexLine = [];
  var flexLines = [flexLine]; // 存放flex容器中以行分组的每组元素
  /**
   * 刚开始一个元素未进行排版时，mainSpace剩余空间的大小为mainSize的大小
   */
  var mainSpace = elementStyle[mainSize];
  // 初始交叉轴容器剩余空间
  var crossSpace = 0;

  // 遍历flex容器子元素
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    // 处理子元素的style
    var itemStyle = getStyle(item);

    // 如果子元素没有mainSize的属性没有设置，则为0
    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    /**
     * 如果子元素有flex属性，则不管改行还有多少剩余空间，都能把当前元素放进去，flex元素可以进行伸缩
     */
    if (itemStyle.flex) {
      flexLine.push(item);
      /**
       *  处理父元素设置了 flex-wrap为nowrap时，且父元素的mainSize是子元素的总和
       * 所有子元素都在一行显示，且父元素没有设置mainSize大小
       */
    } else if (style.flexWrap === "nowrap" && isAutoMainSize) {
      /**
       * 当前主轴的剩余空间 减去 子元素 mainSize的大小
       */
      mainSpace -= itemStyle[mainSize];
      /**
       * 如果子元素的crossSize有值，则与原来crossSpace取最大值，
       * 
       */
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      flexLine.push(item);
    } else {
      /**
       * 如果子元素的 mainSize 比 父元素的 mainSize大时，则把子元素的mainSize设置成与父元素的mainSize一样大
       * 这里子元素单行拍放不下时会换行排放，如果子元素和父元素都设置了mainSize的值，最大去父元素的mainSize值
       */
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
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
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      // 剩余空间减去当前元素mainSize
      mainSpace -= itemStyle[mainSize];
    }
  }
  flexLine.mainSpace = mainSpace; // 记录当前行的剩余空间

  if (style.flexWrap === "nowrap" || isAutoMainSize) {
    flexLine.crossSpace =
      style[crossSize] !== undefined ? style[crossSize] : crossSpace;
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
      itemStyle[mainEnd] =
        itemStyle[mainStart] + mainSign * itemStyle[mainSize];
      currentMain = itemStyle[mainEnd];
    }
  } else {
    flexLines.forEach((items) => {
      var mainSpace = items.mainSpace;
      var flexTotal = 0;
      for (var i = 0; i < items.length; i++) {
        var itemStyle = getStyle(items[i]);

        if (itemStyle.flex !== null && itemStyle.flex !== void 0) {
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
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        }
      } else {
        if (style.justifyContent === "flex-start") {
          var currentMain = mainBase;
          var gap = 0;
        }
        if (style.justifyContent === "flex-end") {
          // 元素的起始位置为 mainSpace + mainBase
          var currentMain = mainSpace * mainSign + mainBase;
          var gap = 0;
        }
        if (style.justifyContent === "center") {
          var currentMain = (mainSpace / 2) * mainSign + mainBase;
          var gap = 0;
        }
        if (style.justifyContent === "space-between") {
          var gap = (mainSpace / (items.length - 1)) * mainSign;
          var currentMain = mainBase;
        }
        if (style.justifyContent === "space-around") {
          var gap = (mainSpace / items.length) * mainSign; // 元素之间的空白
          var currentMain = gap / 2 + mainBase;
        }
        for (var i = 0; i < items.length; i++) {
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] =
            itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + gap;
        }
      }
    });
  }

  // 交叉轴
  var crossSpace;
  if (!style[crossSize]) {
    crossSpace = 0;
    elementStyle[crossSize] = 0;
    for (var i = 0; i < flexLines.length; i++) {
      elementStyle[crossSize] =
        elementStyle[crossSize] + flexLines[i].crossSpace;
    }
  } else {
    crossSpace = style[crossSize];
    for (var i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace;
    }
  }

  if (style.flexWrap === "wrap-reverse") {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }
  var lineSize = style[crossSize] / flexLines.length;

  var gap;
  if (style.alignContent === "flex-start") {
    crossBase += 0;
    gap = 0;
  }
  if (style.alignContent === "flex-end") {
    crossBase += crossSign * crossSpace;
    gap = 0;
  }
  if (style.alignContent === "center") {
    crossBase += (crossSign * crossSpace) / 2;
    gap = 0;
  }
  if (style.alignContent === "space-between") {
    crossBase += 0;
    gap = crossSpace / (flexLines.length - 1);
  }
  if (style.alignContent === "space-around") {
    gap = crossSpace / flexLines.length;
    crossBase += (crossSign * step) / 2;
  }
  if (style.alignContent === "stretch") {
    crossBase += 0;
    gap = 0;
  }
  flexLines.forEach((items) => {
    var lineCrossSize =
      style.alignContent === "stretch"
        ? items.crossSpace + crossSpace / flexLines.length
        : item.crossSpace;
    for (var i = 0; i < items.length; i++) {
      var itemStyle = getStyle(items[i]);

      var align = itemStyle.alignSelf || style.alignItems;

      if (itemStyle[crossSize] === null) {
        itemStyle[crossSize] = align === "stretch" ? lineCrossSize : 0;
      }

      if (align === "flex-start") {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = itemStyle[crossStart];
      }

      if (align === "flex-end") {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossStart] =
          itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      }

      if (align === "center") {
        itemStyle[crossStart] =
          crossBase + (crossSign * (lineCrossSize - itemStyle[crossSize])) / 2;
        itemStyle[crossEnd] =
          itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }

      if (align === "stretch") {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] =
          crossBase +
          crossSign *
            (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0
              ? itemStyle[crossSize]
              : lineCrossSize);
        itemStyle[crossSize] =
          crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);
      }
    }
    crossBase += crossSign * (lineCrossSize + gap);
  });
}

module.exports = layout;
