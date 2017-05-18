///<reference path="lib/phaser.d.ts"/>
///<reference types="colyseus.js"/>
"use strict";
var Colyseus = require("colyseus.js");
//server
var client;
var roomName = "poke_room";
var room;
//game
var game;
var sprites;
var state;
var players;
var nextMoveToServer;
var isStopped;
//cursors
var cursors;
/**
 * start connection on colyseus server and listen to room
 *
 */
function startConnection() {
    var server_uri = 'ws://localhost:3553';
    //connect to colyseus server
    client = new Colyseus.Client(server_uri);
    console.log("connect to server :", server_uri);
    //join specified room
    room = client.join(roomName);
    //When I join the room
    room.onJoin.add(function () {
        console.log(client, "joined", roomName);
    });
    //error
    room.onError.add(function () {
        console.log(client.id, "couldn't join", roomName);
    });
    //when people leave the room
    room.onLeave.add(function (data) {
        console.log(data.id, "leaved", roomName);
        //find 
        var sprite = players[data.id];
        if (sprite != null) {
            sprite.kill();
        }
        delete this.players[data.id];
        console.log(data.id + " is deleted ");
    });
    //when server is sending data
    room.onData.add(function (data) {
        console.log(client.id, " [onData] received on", roomName, data);
    });
    //new game state received : we have to update local game
    room.onUpdate.add(function (newState) {
        //keep the current state
        state = newState;
        //iterate each pokemon
        for (var id in state.pokemons) {
            //get pokemon linked with player
            var pokemon = state.pokemons[id];
            var sprite = players[id];
            if (players[id] == null) {
                //player not knwon : create new sprite 
                var sprite_1 = sprites.getFirstExists(false, true);
                sprite_1.reset(pokemon.x, pokemon.y);
                game.physics.enable(sprite_1, Phaser.Physics.ARCADE);
                sprite_1.body.setSize(32, 32, 32, 32);
                sprite_1.body.bounce.set(0.2);
                sprite_1.frame = pokemon.frame; //sprite image
                players[id] = sprite_1;
            }
            else {
                //update location (if sprite is not current player sprite)
                if (id != client.id) {
                    var xOffset = pokemon.x - sprite.x;
                    var yOffset = pokemon.y - sprite.y;
                    //ease other players movement
                    game.add.tween(sprite).to({ x: pokemon.x, y: pokemon.y }, 100, Phaser.Easing.Linear.None).start();
                }
            }
        }
    });
    //listen to new entity (pokemon)
    room.state.listen("pokemons/:id", "add", function (id, poke) {
        console.log("new pokemon ^^ " + id, poke);
        //create sprite
        var sprite = sprites.getFirstExists(false, true);
        sprite.reset(poke.x, poke.y);
        game.physics.arcade.enable(sprite);
        sprite.body.setSize(32, 32, 32, 32);
        sprite.body.bounce.set(0.2);
        sprite.frame = poke.frame;
        players[poke.id] = sprite;
    });
    //when deleted entity
    room.state.listen("pokemons/:id", "remove", function (id) {
        console.log("kill pokemon ^^ " + id);
        var sprite = players[id];
        if (sprite != null) {
            sprite.kill();
        }
        delete players[id];
    });
    //attribute change
    room.state.listen("pokemons/:id/:attribute", "remove", function (id, name, value) {
        console.log("update pokemon attr " + id + "  " + name + " value = " + value + " ");
        //_this.deletePokemon.dispatch(id);
    });
}
//-------------------
// PHASER game framework part
//preload assets
function preload() {
    game.load.image('landscape', './assets/landscape.png');
    game.load.image('pika', 'assets/pika.png');
    game.load.spritesheet('pokemons', 'assets/pokesprites.png', 96, 96);
}
//create the game
function create() {
    startConnection();
    //start physics
    game.physics.startSystem(Phaser.Physics.ARCADE);
    players = {};
    cursors = this.game.input.keyboard.createCursorKeys();
    game.add.image(0, 0, 'landscape');
    nextMoveToServer = this.game.time.now;
    sprites = this.game.add.group();
    sprites.setAll("body.collideWorldBounds", true);
    sprites.callAll('anchor.setTo', 0.5);
    sprites.createMultiple(16, 'pokemons');
    game.physics.enable(sprites, Phaser.Physics.ARCADE);
}
//update game : called at each frame (FPS)
function update() {
    var SPRITE_VELOCITY = 150;
    var xOffset = 0;
    var yOffset = 0;
    if (cursors.right.isDown) {
        xOffset = SPRITE_VELOCITY;
    }
    else if (cursors.left.isDown) {
        xOffset = -SPRITE_VELOCITY;
    }
    else if (cursors.up.isDown) {
        yOffset = -SPRITE_VELOCITY;
    }
    else if (cursors.down.isDown) {
        yOffset = SPRITE_VELOCITY;
    }
    var my_sprite = players[client.id];
    if (my_sprite != null) {
        my_sprite.body.velocity.set(0);
    }
    if (xOffset != 0 || yOffset != 0) {
        //this.client.action( { action:"move", x: xOffset, y : yOffset });
        my_sprite.body.velocity.x = xOffset;
        my_sprite.body.velocity.y = yOffset;
        isStopped = false;
    }
    else if (!isStopped) {
        if (my_sprite != null) {
        }
        isStopped = true;
    }
    if (!isStopped && nextMoveToServer < game.time.now) {
        if (my_sprite != null)
            client.send({ action: "go", x: my_sprite.x, y: my_sprite.y });
        nextMoveToServer = game.time.now + 10;
    }
}
//render
function render() {
}
//launch gate
window.onload = function () {
    game = new Phaser.Game(16 * 32, 16 * 32, Phaser.AUTO, 'content', { preload: preload, create: create, update: update, render: render });
};
