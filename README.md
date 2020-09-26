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
> 状态机难点是如何根据http response自定义状态,后期会用generator实现状态机