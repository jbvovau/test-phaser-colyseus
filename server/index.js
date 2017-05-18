"use strict";

var colyseus = require('colyseus')
  , http = require('http')

  , express = require('express')
  , app = express()
  , port = process.env.PORT || 3553

  , server = http.createServer(app)
  , gameServer = new colyseus.Server({server: server})

gameServer.register('poke_room', require('./rooms/poke_room'))
server.listen(port);

console.log(`Listening on http://localhost:${ port }`)
