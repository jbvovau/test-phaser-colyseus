///<reference path="lib/phaser.d.ts"/>
///<reference types="colyseus.js"/>

import * as Colyseus from "colyseus.js";

//server
var client: Colyseus.Client;
var roomName = "chat_room";
var room:Colyseus.Room<any>;

//game
var game: Phaser.Game;
var sprites: Phaser.Group;
var state: any;
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
    //let server_uri = 'ws://192.168.1.19:3553';
    let server_uri = 'ws://localhost:3553';

    client = new Colyseus.Client(server_uri);
    console.log("connect to server :", server_uri);
    room = client.join(roomName);
    //let client = new Colyseus.Client ('ws://qno.fr:3553');

    //I join chat room ?
    room.onJoin.add(function () {
        console.log(client, "joined", roomName)
    })

    //error
    room.onError.add(function () {
        console.log(client.id, "couldn't join", roomName)
    })

    //people leave
    room.onLeave.add(function (data: any) {
        console.log(data.id, "leaved", roomName)
        var sprite = players[data];
        if (sprite != null) {
            sprite.kill();
        }
        delete this.players[data];
    })

    //add data
    room.onData.add(function (data: any) {
        console.log(client.id, " [onData] received on", roomName, data);
    })

    //new state
    room.onUpdate.add((newState: any) => {
        state = newState;
        for (var id in state.pokemons) {
            var p = state.pokemons[id];
            let sprite: Phaser.Sprite = players[id];
            if (players[id] == null) {
                console.log("pokemon created from state. Frame : ", p.frame);
                let sp: Phaser.Sprite = sprites.getFirstExists(false, true);
                sp.reset(p.x, p.y);
                game.physics.enable(sp, Phaser.Physics.ARCADE);
                sp.body.setSize(32, 32, 32, 32);
                sp.body.bounce.set(0.2);
                //sp.body.immovable = true;
                sp.frame = p.frame;
                players[id] = sp;
            } else {
                //updateState location
                if (id != client.id) {

                    var xOffset = p.x - sprite.x;
                    var yOffset = p.y - sprite.y;
                    //sprite.position = new Phaser.Point(p.x,p.y);

                     game.add.tween(sprite).to({ x: p.x, y: p.y }, 100, Phaser.Easing.Linear.None).start();
                    //console.log('update location', xOffset, yOffset)
                }
            }
        }
    })

    //new entity
    room.state.listen("pokemons/:id", "add", (id: string, poke: any) => {
        console.log(`new pokemon ^^ ${id}`, poke);
        let sprite: Phaser.Sprite = sprites.getFirstExists(false, true);
        sprite.reset(poke.x, poke.y);
        game.physics.arcade.enable(sprite);
        //sprite.body.immovable = true;
        sprite.body.setSize(32, 32, 32, 32);
        sprite.body.bounce.set(0.2);
        sprite.frame = poke.frame;
        players[poke.id] = sprite;

    });

    //delete entity
    room.state.listen("pokemons/:id", "remove", (id: string) => {
        console.log(`kill pokemon ^^ ${id}`);
        var sprite = players[id];
        if (sprite != null) {
            sprite.kill();
        }
        delete players[id];
    });

    //attribute change entity
    room.state.listen("pokemons/:id/:attribute", "remove", (id: string, name: string, value: any) => {
        console.log(`update pokemon attr ${id}  ${name} value = ${value} `);
        //_this.deletePokemon.dispatch(id);
    });
}

/**
 * Send action
 */
function sendActionToServer(data: any) {
    client.send(data);
}

/**
 * 
 */
function preload() {
    game.load.image('landscape', './assets/landscape.png');
    game.load.image('pika', 'assets/pika.png');
    game.load.spritesheet('pokemons', 'assets/pokesprites.png', 96, 96);
}

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

function update() {

    //var docol = this.game.physics.arcade.collide(this.sprites,this.sprites);

    const SPRITE_VELOCITY = 150;
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

    if (xOffset != 0 || yOffset != 0) {
        //this.client.action( { action:"move", x: xOffset, y : yOffset });
        my_sprite.body.velocity.x = xOffset;
        my_sprite.body.velocity.y = yOffset;
        isStopped = false;
    } else if (!isStopped) {
        if (my_sprite != null) {
            //this.client.action({ action:"stop", x:my_sprite.x, y:my_sprite.y });
        }
        isStopped = true;
    }

    if (!isStopped && nextMoveToServer < game.time.now) {
        if (my_sprite != null) sendActionToServer({ action: "go", x: my_sprite.x, y: my_sprite.y });
        nextMoveToServer = game.time.now + 10;
    }
}


function render() {

}


window.onload = () => {
    game = new Phaser.Game(16 * 32, 16 * 32, Phaser.AUTO, 'content', { preload: preload, create: create, update: update, render: render });
};