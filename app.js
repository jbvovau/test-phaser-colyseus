var ClientGame = (function () {
    function ClientGame() {
        var _this = this;
        this.connected = new Phaser.Signal();
        this.updateState = new Phaser.Signal();
        this.newData = new Phaser.Signal();
        this.newPokemon = new Phaser.Signal();
        this.deletePokemon = new Phaser.Signal();
        var server_uri = 'ws://localhost:3553';
        var client = new Colyseus.Client(server_uri);
        console.log("connect to server :", server_uri);
        this.client = client;
        var roomName = "chat_room";
        var room = client.join(roomName);
        room.onJoin.add(function () {
            console.log(client.id, "joined", roomName);
            client.send("Hello world !");
            _this.connected.dispatch(client.id);
        });
        room.onError.add(function () {
            console.log(client.id, "couldn't join", roomName);
        });
        room.onLeave.add(function (client) {
            console.log(client.id, "leaved", roomName);
            _this.deletePokemon.dispatch(client);
        });
        room.onData.add(function (data) {
            console.log(client.id, " [onData] received on", roomName, data.data.action);
            _this.newData.dispatch(data);
        });
        room.onUpdate.add(function (newState) {
            _this.updateState.dispatch(newState);
        });
        room.state.listen("pokemons/:id", "add", function (id, value) {
            console.log("new pokemon ^^ " + id, value);
            _this.newPokemon.dispatch(value);
        });
        room.state.listen("pokemons/:id", "remove", function (id) {
            console.log("kill pokemon ^^ " + id);
            _this.deletePokemon.dispatch(id);
        });
        room.state.listen("pokemons/:id/:attribute", "remove", function (id, name, value) {
            console.log("update pokemon attr " + id + "  " + name + " value = " + value + " ");
        });
    }
    ClientGame.prototype.action = function (data) {
        data.id = this.client.id;
        this.client.send(data);
    };
    return ClientGame;
}());
var MyGame = (function () {
    function MyGame(div) {
        this.game = new Phaser.Game(16 * 32, 16 * 32, Phaser.AUTO, div, { preload: this.preload, create: this.create, update: this.update, render: this.render });
    }
    MyGame.prototype.preload = function () {
        this.game.load.image('landscape', './assets/landscape.png');
        this.game.load.image('pika', 'assets/pika.png');
        this.game.load.spritesheet('pokemons', 'assets/pokesprites.png', 96, 96);
    };
    MyGame.prototype.create = function () {
        var _this = this;
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
        var _my = this;
        this.updateState = function (state) {
            _my.state = state;
            for (var id in state.pokemons) {
                var p = state.pokemons[id];
                var sprite = _my.players[id];
                if (_my.players[id] == null) {
                    console.log("pokemon created from state. Frame : ", p.frame);
                    var sp = _my.sprites.getFirstExists(false, true);
                    sp.reset(p.x, p.y);
                    _my.game.physics.enable(sp, Phaser.Physics.ARCADE);
                    sp.body.setSize(32, 32, 32, 32);
                    sp.body.bounce.set(0.2);
                    sp.frame = p.frame;
                    _my.players[id] = sp;
                }
                else {
                    if (id != _my.my_id) {
                        var xOffset = p.x - sprite.x;
                        var yOffset = p.y - sprite.y;
                        _this.game.add.tween(sprite).to({ x: p.x, y: p.y }, 100, Phaser.Easing.Linear.None).start();
                    }
                }
            }
        };
        this.updateData = function (obj) {
        };
        this.client.connected.add(function (id) {
            console.log("new connection done, my id is : ", id);
            _this.my_id = id;
        }, this);
        this.client.updateState.add(this.updateState, this);
        this.client.newData.add(this.updateData, this);
        this.client.newPokemon.add(function (poke) {
            console.log("pokemon created from entity");
            var sprite = _this.sprites.getFirstExists(false, true);
            sprite.reset(poke.x, poke.y);
            _this.game.physics.arcade.enable(sprite);
            sprite.body.setSize(32, 32, 32, 32);
            sprite.body.bounce.set(0.2);
            sprite.frame = poke.frame;
            _this.players[poke.id] = sprite;
        }, this);
        this.client.deletePokemon.add(function (id) {
            var sprite = _this.players[id];
            if (sprite != null) {
                sprite.kill();
            }
            delete _this.players[id];
        }, this);
    };
    MyGame.prototype.update = function () {
        var SPRITE_VELOCITY = 150;
        var xOffset = 0;
        var yOffset = 0;
        if (this.cursors.right.isDown) {
            xOffset = SPRITE_VELOCITY;
        }
        else if (this.cursors.left.isDown) {
            xOffset = -SPRITE_VELOCITY;
        }
        else if (this.cursors.up.isDown) {
            yOffset = -SPRITE_VELOCITY;
        }
        else if (this.cursors.down.isDown) {
            yOffset = SPRITE_VELOCITY;
        }
        var my_sprite = this.players[this.my_id];
        if (my_sprite != null) {
            my_sprite.body.velocity.set(0);
        }
        if (xOffset != 0 || yOffset != 0) {
            my_sprite.body.velocity.x = xOffset;
            my_sprite.body.velocity.y = yOffset;
            this.isStopped = false;
        }
        else if (!this.isStopped) {
            if (my_sprite != null) {
            }
            this.isStopped = true;
        }
        if (!this.isStopped && this.nextMoveToServer < this.game.time.now) {
            if (my_sprite != null)
                this.client.action({ action: "go", x: my_sprite.x, y: my_sprite.y });
            this.nextMoveToServer = this.game.time.now + 10;
        }
    };
    MyGame.prototype.render = function () {
    };
    return MyGame;
}());
window.onload = function () {
    var game = new MyGame('content');
};
//# sourceMappingURL=app.js.map