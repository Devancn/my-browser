const http = require("http");

const server = http.createServer((req, res) => {
    console.log("request received");
    console.log(req.headers);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-foo', 'bar');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`<html maaa=a >
<head>
    <style>
#container {
    width:500px;
    height:300px;
    background-color:rgb(255,255,255);
    display:flex;
}
body div #myid{
    width:200px;
    height:100px;
    background-color:rgb(255,0,0);
}
body div .cl{
    flex:1;
    background-color:rgb(0,255,0);
}
    </style>
</head>
<body>
    <div id="container">
        <div id="myid"/>
        <div class="cl" />
    </div>
</body>
</html>`);
})

server.listen(8088)