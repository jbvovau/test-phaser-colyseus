///<reference path="lib/phaser.d.ts"/>
///<reference types="colyseus.js"/>

import * as Colyseus from "colyseus.js";

//server
var client: Colyseus.Client;
var roomName = "poke_room";
var room:Colyseus.Room<any>;

//game
var game: Phaser.Game;
var sprites: Phaser.Group;
var walls: Phaser.Group;
var state: any;
var landscapeCreated:boolean;

//game state
var players: any;

var nextMoveToServer: number;

var isStopped: boolean;
//cursors
var cursors: Phaser.CursorKeys;

/**
 * start connection on colyseus server and listen to room
 * 
 */
function startConnection() {
    let server_uri = 'ws://localhost:3553';
    //connect to colyseus server
    client = new Colyseus.Client(server_uri);
    console.log("connect to server :", server_uri);
    //join specified room
    room = client.join(roomName);

    //When I join the room
    room.onJoin.add(function () {
        console.log(client, "joined", roomName);
    })

    //error
    room.onError.add(function () {
        console.log(client.id, "couldn't join", roomName)
    })

    //when people leave the room
    room.onLeave.add(function (data: any) {
        console.log(data.id, "leaved", roomName)
        //find 
        var sprite = players[data.id];
        if (sprite != null) {
            sprite.kill();
        }
        delete this.players[data.id];
        console.log(`${data.id} is deleted `);
    })

    //when server is sending data
    room.onData.add(function (data: any) {
        console.log(client.id, " [onData] received on", roomName, data);
    })

    //new game state received : we have to update local game
    room.onUpdate.add((newState: any) => {
        //keep the current state
        state = newState;
        //iterate each pokemon
        for (var id in state.pokemons) {
            //get pokemon linked with player
            var pokemon = state.pokemons[id];
            if (players[id] == null) {
                //player not knwon : create new sprite 
                let sprite : Phaser.Sprite = sprites.getFirstExists(false, true);
                sprite.reset(pokemon.x, pokemon.y);
                game.physics.enable(sprite, Phaser.Physics.ARCADE);
                sprite.body.setSize(32, 32, 32, 32);
                sprite .body.bounce.set(0.2);
                sprite.frame = pokemon.frame;   //sprite image
                players[id] = sprite;
            } else {

            }
        } // end foreach pokemons
        //iterate walls
        if (!landscapeCreated){
            landscapeCreated = true;
            state.walls.forEach((element:any) => {
                var wall = walls.getFirstExists(false, true,element.x , element.y,'wall');
                
            });
            
        }

    })

    //listen to new entity (pokemon)
    room.state.listen("pokemons/:id", "add", (id: string, poke: any) => {
        console.log(`new pokemon ^^ ${id}`, poke);
        //create sprite
        let sprite: Phaser.Sprite = sprites.getFirstExists(false, true);
        sprite.reset(poke.x, poke.y);
        game.physics.arcade.enable(sprite);
        sprite.body.setSize(32, 32, 32, 32);
        sprite.body.bounce.set(0.2);
        sprite.frame = poke.frame;
        players[poke.id] = sprite;

    });

    //when deleted entity
    room.state.listen("pokemons/:id", "remove", (id: string) => {
        console.log(`kill pokemon ^^ ${id}`);
        var sprite = players[id];
        if (sprite != null) {
            sprite.kill();
        }
        delete players[id];
    });

    //attribute change
    room.state.listen("pokemons/:id/:attribute", "replace", (id: string, name: string, value: any) => {
        //update location (if sprite is not current player sprite)
        let sprite:any = players[id];
        if (id != client.id && sprite != null) {
            sprite[name] = value;
            var offset = value - sprite[name];
            //ease other players movement
            var move:any = {};
            move[name] = value;
            game.add.tween(sprite).to(move, 50, Phaser.Easing.Linear.None).start(); 
        }
    });

    //attribute change
    room.state.listen("walls/:id/:attribute", "replace", (id: string, name: string, value: any) => {
        console.log(`update wall attr ${id}  ${name} value = ${value} `);
    });
}


//-------------------
// PHASER game framework part

//preload assets
function preload() {
    game.load.image('landscape', './assets/landscape.png');
    game.load.image('pika', 'assets/pika.png');
    game.load.image('wall', 'assets/wall.png');
    game.load.spritesheet('pokemons', 'assets/pokesprites.png', 96, 96);
}

//create the game
function create() {
    
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

    walls = this.game.add.group();
    walls.createMultiple(5,'wall');
   
    game.physics.enable(walls, Phaser.Physics.ARCADE);
    walls.setAll('body.immovable', true);
    
    startConnection();
}

//update game : called at each frame (FPS)
function update() {
    game.physics.arcade.collide(sprites,walls);

    const SPRITE_VELOCITY = 350;
    let xOffset: number = 0;
    let yOffset: number = 0;

    if (cursors.right.isDown) {
        xOffset = SPRITE_VELOCITY;
    } else if (cursors.left.isDown) {
        xOffset = -SPRITE_VELOCITY;
    } else if (cursors.up.isDown) {
        yOffset = -SPRITE_VELOCITY;
    } else if (cursors.down.isDown) {
        yOffset = SPRITE_VELOCITY;
    }

    var my_sprite = players[client.id];
    if (my_sprite != null) {
        my_sprite.body.velocity.set(0);
        //this.client.action({ action:"stop_velocity" });
    }

    isStopped = true;
    if (xOffset != 0 || yOffset != 0) {
        //this.client.action( { action:"move", x: xOffset, y : yOffset });
        my_sprite.body.velocity.x = xOffset;
        my_sprite.body.velocity.y = yOffset;
        isStopped = false;
    } 

    //send information of current sprite position every 20mms
    if (!isStopped && nextMoveToServer < game.time.now) {
        if (my_sprite != null) client.send({ action: "go", x: my_sprite.x, y: my_sprite.y });
        nextMoveToServer = game.time.now + 20;
    }
}

//render
function render() {

}

//launch game
window.onload = () => {
    game = new Phaser.Game(16 * 32, 16 * 32, Phaser.AUTO, 'content', { preload: preload, create: create, update: update, render: render });
};