///<reference path="lib/phaser.d.ts"/>
///<reference types="colyseus.js"/>

//import * as Colyseus from "colyseus.js";

/**
 * Listen to server
 */

class ClientGame {
    private client: Colyseus.Client;

    connected: Phaser.Signal;
    updateState: Phaser.Signal;
    newData: Phaser.Signal;
    newPokemon: Phaser.Signal;
    deletePokemon: Phaser.Signal;

    constructor() {
        var _this = this;
        this.connected = new Phaser.Signal();       //client is connected
        this.updateState = new Phaser.Signal();     //new state is available
        this.newData = new Phaser.Signal();         //new data is coming
        this.newPokemon = new Phaser.Signal();
        this.deletePokemon = new Phaser.Signal();

        //let server_uri = 'ws://192.168.1.19:3553';
        let server_uri = 'ws://localhost:3553';
        let client = new Colyseus.Client(server_uri);
        console.log("connect to server :", server_uri);

        //let client = new Colyseus.Client ('ws://qno.fr:3553');
        this.client = client;
        var roomName = "poke_room";
        var room = client.join(roomName);

        //new people on room
        room.onJoin.add(function () {
            console.log(client.id, "joined", roomName)
            client.send("Hello world !");
            _this.connected.dispatch(client.id);
        })

        //error
        room.onError.add(function () {
            console.log(client.id, "couldn't join", roomName)
        })

        //people leave
        room.onLeave.add(function (client: any) {
            console.log(client.id, "leaved", roomName)
            _this.deletePokemon.dispatch(client);
        })

        //add data
        room.onData.add(function (data: any) {
            console.log(client.id, " [onData] received on", roomName, data.data.action);
            _this.newData.dispatch(data);
        })

        //new state
        room.onUpdate.add(function (newState: any) {
            //console.log(roomName, " [onupdateState] has a new state:", newState)
            _this.updateState.dispatch(newState);
        })

        //new entity
        room.state.listen("pokemons/:id", "add", (id: string, value: any) => {
            console.log(`new pokemon ^^ ${id}`, value);
            _this.newPokemon.dispatch(value);

        });
        //delete entity
        room.state.listen("pokemons/:id", "remove", (id: string) => {
            console.log(`kill pokemon ^^ ${id}`);
            _this.deletePokemon.dispatch(id);
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
    action(data: any) {
        data.id = this.client.id;
        this.client.send(data);
    }
}

/**
 * New app
 */
class MyGame {


    private game: Phaser.Game;
    private sprites: Phaser.Group;
    private client: ClientGame;
    private state: any;
    private players: any;
    private my_id: any;

    private nextMoveToServer: number;

    private isStopped: boolean;
    //cursors
    private cursors: Phaser.CursorKeys;

    //functions
    private updateState: Function;
    private updateData: Function;

    constructor(div: string) {
        this.game = new Phaser.Game(16 * 32, 16 * 32, Phaser.AUTO, div, { preload: this.preload, create: this.create, update: this.update, render: this.render });

    }

    preload() {
        this.game.load.image('landscape', './assets/landscape.png');
        this.game.load.image('pika', 'assets/pika.png');
        this.game.load.spritesheet('pokemons', 'assets/pokesprites.png', 96, 96);
    }

    create() {

        //start physics
        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        this.client = new ClientGame();
        this.players = {};
        this.cursors = this.game.input.keyboard.createCursorKeys();

        this.game.add.image(0, 0, 'landscape');
        this.nextMoveToServer = this.game.time.now;

        this.sprites = this.game.add.group();
        this.sprites.setAll("body.collideWorldBounds", true);
        this.sprites.callAll('anchor.setTo', 0.5);
        this.sprites.createMultiple(16, 'pokemons');
        this.game.physics.enable(this.sprites, Phaser.Physics.ARCADE);


        //updateState state
        var _my = this;
        this.updateState = (state: any) => {
            //console.log("new state todo !", state);
            _my.state = state;
            for (var id in state.pokemons) {
                var p = state.pokemons[id];
                let sprite: Phaser.Sprite = _my.players[id];
                if (_my.players[id] == null) {
                    console.log("pokemon created from state. Frame : ", p.frame);
                    let sp: Phaser.Sprite = _my.sprites.getFirstExists(false, true);
                    sp.reset(p.x, p.y);
                    _my.game.physics.enable(sp, Phaser.Physics.ARCADE);
                    sp.body.setSize(32, 32, 32, 32);
                    sp.body.bounce.set(0.2);
                    //sp.body.immovable = true;
                    sp.frame = p.frame;
                    _my.players[id] = sp;
                } else {
                    //updateState location
                    if (id != _my.my_id) {

                        var xOffset = p.x - sprite.x;
                        var yOffset = p.y - sprite.y;
                        //sprite.position = new Phaser.Point(p.x,p.y);

                        this.game.add.tween(sprite).to({ x: p.x, y: p.y }, 100, Phaser.Easing.Linear.None).start();
                        //console.log('update location', xOffset, yOffset)
                    }
                }
            }
        };

        //receive new data
        this.updateData = (obj: any) => {
            /*
            let data:any = obj.data;
            let action:string = data.action;
            let id:string = obj.from;
            let sprite:Phaser.Sprite = this.players[id];

            if (id = this.my_id) return;

            switch(action) {
                case "stop":
                    sprite.body.velocity.set(0);
                    sprite.x = data.x;
                    sprite.y = data.y;
                    break;
                case "go":
                    this.game.add.tween(sprite).to({x: data.x , y : data.y},100);
                    break;
                case "stop_velocity":
                    sprite.body.velocity.set(0);
                break;
            } */
        }

        //connection done
        this.client.connected.add((id: string) => {
            console.log("new connection done, my id is : ", id);
            this.my_id = id;
        }, this);

        //new state received
        this.client.updateState.add(this.updateState, this);
        //new message
        this.client.newData.add(this.updateData, this);
        //new pokemon
        this.client.newPokemon.add((poke: any) => {
            console.log("pokemon created from entity");
            let sprite: Phaser.Sprite = this.sprites.getFirstExists(false, true);
            sprite.reset(poke.x, poke.y);
            this.game.physics.arcade.enable(sprite);
            //sprite.body.immovable = true;
            sprite.body.setSize(32, 32, 32, 32);
            sprite.body.bounce.set(0.2);
            sprite.frame = poke.frame;
            this.players[poke.id] = sprite;
        }, this);

        //delete pokemon
        this.client.deletePokemon.add((id: any) => {
            var sprite = this.players[id];
            if (sprite != null) {
                sprite.kill();
            }
            delete this.players[id];
        }, this);


    }

    update() {

        //var docol = this.game.physics.arcade.collide(this.sprites,this.sprites);

        //if (docol) console.log('collision');

        const SPRITE_VELOCITY = 150;
        let xOffset: number = 0;
        let yOffset: number = 0;

        if (this.cursors.right.isDown) {
            xOffset = SPRITE_VELOCITY;
        } else if (this.cursors.left.isDown) {
            xOffset = -SPRITE_VELOCITY;
        } else if (this.cursors.up.isDown) {
            yOffset = -SPRITE_VELOCITY;
        } else if (this.cursors.down.isDown) {
            yOffset = SPRITE_VELOCITY;
        }

        var my_sprite = this.players[this.my_id];
        if (my_sprite != null) {
            my_sprite.body.velocity.set(0);
            //this.client.action({ action:"stop_velocity" });
        }

        if (xOffset != 0 || yOffset != 0) {
            //this.client.action( { action:"move", x: xOffset, y : yOffset });
            my_sprite.body.velocity.x = xOffset;
            my_sprite.body.velocity.y = yOffset;
            this.isStopped = false;
        } else if (!this.isStopped) {
            //console.log("updateState to stop ", this.my_id);
            //if (this.my_sprite != null)this.my_sprite.body.velocity.set(0);
            if (my_sprite != null) {
                //this.client.action({ action:"stop", x:my_sprite.x, y:my_sprite.y });
            }
            this.isStopped = true;
        }

        if (!this.isStopped && this.nextMoveToServer < this.game.time.now) {
            //console.log('up');
            if (my_sprite != null) this.client.action({ action: "go", x: my_sprite.x, y: my_sprite.y });
            this.nextMoveToServer = this.game.time.now + 10;
        }
    }


    render() {

    }
}


window.onload = () => {
    var game = new MyGame('content');
};