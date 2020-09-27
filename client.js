
const net = require("net");
const { threadId } = require("worker_threads");

/**
 * Request需要的信息有：
 * method, url = host + port + path
 * body: k/v
 * headers
 */
class Request {
    constructor(options) {
        this.method = options.method || "GET";
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || "/";
        this.body = options.body || {};
        this.headers = options.headers || {};
        // 设置默认content-type值，并根据content-type值把body编码成对应文本
        if (!this.headers["Content-Type"]) {
            this.headers["Content-Type"] = "application/x-www-form-urlencode";
        }
        if (this.headers["Content-Type"] === "application/json") {
            this.bodyText = JSON.stringify(this.body)
        } else if (this.headers["Content-Type"] === "application/x-www-form-urlencode") {
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&');
        }
        // 设置conent-length文本为body编码后的文本长度
        this.headers['Content-Type'] = this.bodyText.length;
    }

    // 根据request信息构建http文本
    toString() {
        return `${this.method} / HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r 
\r
${this.bodyText}`
    }
    // 使用net模块创建socket发送数据
    send(connection) {
        return new Promise((resolve, reject) => {
            const parser = new ResponseParser;
            if (connection) {
                connection.write(this.toString());
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString());
                })
            }

            connection.on('data', data => {
                parser.receive(data.toString());

                if (parser.isFinished) {
                    resolve(parser.response);
                }
                connection.end();
            })
            connection.on('error', err => {
                reject(err);
                connection.end();
            })
        });
    }
}


class Response {

}

/**
 * 解析处理status line、header、分割行的状态机
 */
class ResponseParser {
    constructor() {
        // status line状态
        this.WAITING_STATUS_LINE = 0; // 等待status line
        this.WAITING_STATUS_LINE_END = 1; // status line后接收到\r
        // header 状态(多个header时会重复header处理流程)
        this.WAITING_HEADER_NAME = 2; // 接收header名字部分
        this.WAITING_HEADER_SPACE = 3; // ':'后面的空格
        this.WAITING_HEADER_VALUE = 4; // 接收到':'后为header值
        this.WAITING_HEADER_LINE_END = 5; // 值后面\r\n
        // header 与 body之间的分割（两个空行） 
        this.WAITING_HEADER_BLOCK_END = 6;
        // 处理body状态
        this.WAITING_BODY = 7;

        // 状态机当前状态
        this.current = this.WAITING_STATUS_LINE;
        // 状态栏信息
        this.statusLine = "";
        // 响应头信息
        this.headers = {};
        // 响应头名称
        this.headerName = "";
        // 响应头值
        this.headerValue = "";
        // body状态机
        this.bodyParser = null;
    }
    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished;
    }
    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }
    // 处理socket接收到的数据
    receive(string) {
        for (let i = 0; i < string.length; i++) {
            this.receiveChar(string.charAt(i));
        }
    }
    // 根据接收到的字符信息与状态机状态处理对应状态信息
    receiveChar(char) {
        // 后期可以优化成每一个状态对应一个函数进行处理
        if (this.current === this.WAITING_STATUS_LINE) { // 等待接收status line字符状态
            if (char === '\r') { // \r结束
                this.current = this.WAITING_STATUS_LINE_END;
            } else {
                if (char === '\n') { // \n结束
                    this.current = this.WAITING_HEADER_NAME;
                } else {
                    this.statusLine += char;
                }
            }

        } else if (this.current === this.WAITING_STATUS_LINE_END) { // 处理header部分
            if (char === '\n') {// 以'\n'结束
                this.current = this.WAITING_HEADER_NAME;
            }
        } else if (this.current === this.WAITING_HEADER_NAME) {
            if (char === ':') { // 以':'结束
                this.current = this.WAITING_HEADER_SPACE;
            } else if (char === '\r') {// \r结束
                this.current = this.WAITING_HEADER_BLOCK_END;
                if (this.headers['Transfer-Encoding'] === 'chunked') { // 根据header头Transfer-Encoding值进行处理body
                    this.bodyParser = new TrunkdBodyParser();
                }
            } else {
                this.headerName += char;
            }
        } else if (this.current === this.WAITING_HEADER_SPACE) {
            if (char === ' ') {// 以' '结束
                this.current = this.WAITING_HEADER_VALUE;
            }
        } else if (this.current === this.WAITING_HEADER_VALUE) {
            if (char === '\r') { // 以'\r'结束
                this.current = this.WAITING_HEADER_LINE_END;
                this.headers[this.headerName] = this.headerValue;
                this.headerName = '';
                this.headerValue = '';
            } else {
                this.headerValue += char;
            }
        } else if (this.current === this.WAITING_HEADER_LINE_END) { // 处理多个header情况
            if (char === '\n') {// 以'\n'结束
                this.current = this.WAITING_HEADER_NAME;
            }
        } else if (this.current === this.WAITING_HEADER_BLOCK_END) { // 处理header部分
            if (char === '\n') {// 以'\n'结束
                this.current = this.WAITING_BODY;
            }
        } else if (this.current === this.WAITING_BODY) {
            this.bodyParser.receiveChar(char);
        }
    }
}

// 解析处理body部分的状态机
/**
 * body的内容格式为,如:
 * 2/r/nok
 */
class TrunkdBodyParser {
    constructor() {
        // 状态定义
        this.WAITING_LENGTH = 0; // 十进制length
        this.WAITING_LENGTH_LINE_END = 1; // 十进制length结束
        this.READING_TRUNK = 2; // 获取trunk
        this.WAITING_NEW_LINE = 3; // 十进制length读取开始
        this.WAITING_NEW_LINE_END = 4; // 十进制length读取结束
        this.length = 0; // 表示读取到的length字符（这里转成十进制）
        this.content = []; // 用来存放接收到的trunk
        this.isFinished = false; // body是否已经解析完成
        // 状态机当前状态
        this.current = this.WAITING_LENGTH;
    }
    receiveChar(char) {
        // console.log(JSON.stringify(char))
        if (this.current === this.WAITING_LENGTH) {
            if (char === '\r') {
                if (this.length === 0) { // 如果读取到的length为0，表示body解析完成
                    this.isFinished = true;
                }
                this.current = this.WAITING_LENGTH_LINE_END;
            } else {
                // 字符串转数字，也可以用Number(^_^)
                this.length *= 16;
                this.length += parseInt(char, 16);
            }
        } else if (this.current === this.WAITING_LENGTH_LINE_END) {
            if (char === '\n') {
                this.current = this.READING_TRUNK;
            }
        } else if (this.current === this.READING_TRUNK) {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINE;
            } else {
                if(char === '\n') {
                    this.current = this.WAITING_LENGTH;
                } else {
                    this.content.push(char);
                    this.length--;
                    if (this.length === 0) {
                        this.current = this.WAITING_NEW_LINE;
                    }
                }
            } 

        } else if (this.current === this.WAITING_NEW_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINE_END;
            }
        } else if (this.current === this.WAITING_NEW_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_LENGTH;
            }
        }

    }
}

void async function () {
    let request = new Request({
        method: "POST ",
        host: "127.0.0.1",
        port: "8088",
        path: '/',
        headers: {
            ["X-Foo2"]: "customed"
        },
        body: {
            name: "Devan"
        }
    });
    let response = await request.send();
    console.log(response);
}();

/*
const client = net.createConnection({
   host: '127.0.0.1',
   port: 8088
}, () => {
   let request = new Request({
       method: "POST ",
       host: "127.0.0.1",
       port: "8088",
       path: '/',
       headers: {
           ["X-Foo2"]: "customed"
       },
       body: {
           name: "Devan"
       }
   })
   console.log(request.toString())
   client.write(request.toString())
  client.write(`POST / HTTP/1.1\r
Content-Type: application/x-www-form-urlencode\r
Content-Length:11\r
\r
name=devan`)
})
client.on('data', data => {
   console.log(data.toString());
   client.end();
})

client.on('end', () => {
   console.log('disconnected from server')
})
*/