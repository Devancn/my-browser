
// http实现标准 https://tools.ietf.org/html/rfc2616
const net = require("net");

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
                resolve(data.toString());
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
 * 使用状态机处理socket接收到的数据然后产生多个response
 * 完整的response包括status line、headers、body
 */
class ResponseParser {
    constructor() {
        // status line状态
        this.WAITING_STATUS_LINE = 0; // 等待status line
        this.WAITING_STATUS_LINE_END = 1; // status line后接收到\r\n
        // header 状态(多个header时会重复header处理流程)
        this.WAITING_HEADER_NAME = 2; // 接收header名字部分
        this.WAITING_HEADER_VALUE = 3; // 接收到':'后为header值
        this.WAITING_HEADER_LINE_END = 4; // 值后面\r\n
        // header 与 body之间的分割（两个空行） 
        this.WAITING_HEADER_BLOCK_END = 5;
    }
    receive(string) {

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