const http = require("http");

const server = http.createServer((req, res) => {
    console.log("request received");
    console.log(req.headers);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-foo', 'bar');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`
<html maaa=a >
<head>
    <style>
#container {
    width:500px;
    height:300px;
    display:flex;
}
#container #myid{
    width: 200px;
}
#container .cl1{
    flex:1;
}
    </style>
</head>
<body>
    <div id="container">
        <div id="myid"/>
        <div class="cl1"/>
    </div>
</body>
</html>
`);
})

server.listen(8088)