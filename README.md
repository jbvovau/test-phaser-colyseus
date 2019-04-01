# test-phaser-colyseus

Simple template project to test "Colyseus" multiplayers server, with Phaser game framework.

* More about Colyseus : https://github.com/gamestdio/colyseus
* More about Phaser game framework : https://phaser.io

## Get started

### Install and launch server

Download project using git :

 `git clone https://github.com/balmeyer/test-phaser-colyseus`

Move to project
* `cd test-phaser-colyseus`

Install Colyseus server using npm :

* `cd server`
* `npm install`
 
Then start the server

`npm start`
 
### Install and launch client

You can launch client using node "http-server".

`npm install http-server`
 
And then run the web server with HTML5 app with "http-server"

The application is available at : http://127.0.0.1:8080

### More

The folder `server` is a modification of `colyseus-starter` (https://github.com/endel/colyseus-starter). The file `poke_room.js` contains server side code.

The game code is available in `main.ts` a file in TypeScript compiled into `main.js` javascript code.

