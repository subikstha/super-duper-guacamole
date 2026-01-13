import http from "http";
import handler from "serve-handler";
import nanobuffer from "nanobuffer";

// these are helpers to help you deal with the binary data that websockets use
import objToResponse from "./obj-to-response.js";
import generateAcceptValue from "./generate-accept-value.js";
import parseMessage from "./parse-message.js";

let connections = [];
const msg = new nanobuffer(50);
const getMsgs = () => Array.from(msg).reverse();

msg.push({
  user: "brian",
  text: "hi",
  time: Date.now(),
});

// serve static assets
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: "./frontend",
  });
});

/*
 *
 * your code goes here
 *
 */

server.on("upgrade", (request, socket) => {
  if (request.headers["upgrade"] !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n")
    return;
  }

  const acceptKey = request.headers["sec-websocket-key"];
  const acceptValue = generateAcceptValue(acceptKey);

  const headers = [
    'HTTP/1.1 101 Web Socket Protocol Handshake',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-Websocket-Accept: ${acceptValue}`,
    'Sec-WebSocket-Protocol: json',
    "\r\n" // Add white space to say this is the end of the headers and everything after this is data
  ]

  socket.write(headers.join("\r\n"));
  socket.write(objToResponse({
    msg: getMsgs()
  }))

  connections.push(socket)

  // Receive information from the client
  socket.on("data", (buffer) => {
    const message = parseMessage(buffer)
    console.log(message)
    if (message) {
      msg.push({
        user: message.user,
        text: message.text,
        time: Date.now()
      })

      connections.forEach((sock) => {
        sock.write(objToResponse({
          msg: getMsgs()
        }))
      })
    } else if (message === null) {
      socket.end()
    }


    socket.end(() => {
      connections = connections.filter((conn) => conn !== socket)
    })
  })
})

const port = process.env.PORT || 8080;
server.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
