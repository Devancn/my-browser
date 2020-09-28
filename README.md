#### http协议rfc(Request For Comments)标准文档
[Request For Comments地址](https://tools.ietf.org/html/rfc2616)
> response包括status line、headers、body

### /r/n解释
- \r(return) 使光标到行首
- \n(newline) 使光标下移一格
> windows: \r\n; mac: \r; unix: \n

### http响应内容
```
HTTP/1.1 200 OK
Content-Type: text/plain
X-foo: bar
Date: Sat, 26 Sep 2020 12:03:24 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

2
ok
0
```
stringify后
```
"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nX-foo: bar\r\nDate: Sat, 26 Sep 2020 12:01:41 GMT\r\nConnection: keep-alive\r\nKeep-Alive: timeout=5\r\nTransfer-Encoding: chunked\r\n\r\n2\r\nok\r\n0\r\n\r\n"
```
### html词法BNF产生式定义
[html词法标准](https://html.spec.whatwg.org/multipage/parsing.html#tokenization)
> 状态机难点是如何根据http response自定义状态,然后根据读取到的每一个字符切换不同状态，每个状态处理不同逻辑。后期会用generator实现状态机，思路可以参考《重学前端》小册


### DOM树构建流程要点
#### 标签类型有（每一个对应一种状态）
- 开始标签
- 结束标签
- 自封闭标签
#### 属性值有（每一个对应一种状态）
- 单引号
- 双引号
- 无引号
#### 使用栈创建元素流程
1. 遇到开始标签时创建元素并入栈，遇到结束标签时出栈
2. 自封闭节点可视为入栈后立刻出栈
3. 任何元素的父元素是它入栈前的栈顶

### CSS计算时机
当创建一个元素后立即计算CSS。理论上计算一个元素CSS时，所有CSS规则已经收集完毕。遇到style标签时会重新计算CSS规则（重新计算可能导致重排重绘）。

### CSS匹配规则
当前元素与css规则中每一条selectors从内向外匹配如`["body div #myid"]`，匹配顺序是#myid>div>body