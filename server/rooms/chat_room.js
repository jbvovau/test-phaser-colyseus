"use strict";
var Room = require('colyseus').Room

class PokeState {
  constructor(){
    this.pokemons = {};
  }

  toJSON(){
    return {
      pokemons:this.pokemons
    }
  }
}

"use strict";
class ChatRoom extends Room {



  constructor (options) {
    super( options )

    // Broadcast patched state to all connected clients at 20fps (50ms)
    this.setPatchRate( 1000 / 20 )

    // // Call this function if you intend to implement delay compensation
    // // techniques in your game
    // this.useTimeline()

    // Call game simulation at 60fps (16.6ms)
    this.setSimulationInterval( this.tick.bind(this), 1000 / 60 )

    this.setState(new PokeState());

    this.pokemonFrame = 0;
  }

  requestJoin(options) {
    // only allow 10 clients per room
    return this.clients.length < 10;
  }

  onJoin (client) {
    //add new pokemon
    console.log(client.id, "joined ChatRoom!");
    var x = Math.random() * 400;
    var y = Math.random() * 400;
    this.state.pokemons[client.id] =  ({
      id:client.id, 
      name:"pikachu", 
      client: client, 
      x: x,
      y: y,
      frame: this.pokemonFrame++
    }) ;

    if (this.pokemonFrame > 650) this.pokemonFrame = 0;
    //this.sendState(client);
  }

  onMessage (client, data) {
    //console.log(client.id, "sent message on ChatRoom", data.id)
    switch(data.action){
      case "go":
      case "stop":
        this.state.pokemons[client.id].x = data.x;
        this.state.pokemons[client.id].y = data.y;
      break;
    }
  }

  tick () {
    //
    // This is your 'game loop'.
    // Inside function you'll have to run the simulation of your game.
    //
    // You should:
    // - move entities
    // - check for collisions
    // - update the state
    //

    // // Uncomment this line to see the simulation running and clients receiving the patched state
    // // In this example, the server simply adds the elapsedTime every 2 messages it receives
    // if ( this.state.messages.length % 3 == 0 ) {
    //   this.state.messages.push(`${ this.clock.elapsedTime }: even`)
    // }
  }

  onLeave (client) {
    console.log(client.id, "left ChatRoom");
    delete this.state.pokemons[client.id];
  }

}

module.exports = ChatRoom
