let tileSize = 32;
let rows = 16;
let columns = 16;

let board;
let boardwidth = tileSize * columns;
let boardHeight = tileSize * rows;
let context;

let shipWidth = tileSize * 2;
let shipHeight = tileSize;
let shipX = tileSize * columns / 2 - tileSize;
let shipY = tileSize * rows - tileSize * 2;

let ship = {
    x: shipX,
    y: shipY,
    width: shipWidth,
    height: shipHeight
}

let shipImg;
let shipVelocityX = tileSize / 2;  // Gemiyi yavaşlatmak için daha küçük bir hız

let alienArray = [];
let alienWidth = tileSize * 2;
let alienHeight = tileSize;
let alienX = tileSize;
let alienY = tileSize;
let alienImg;

let alienRows = 2;
let alienColumns = 3;
let alienCount = 0;
let alienVelocityX = 1;  // Yabancıların yatay hızını azaltıyoruz

let bulletArray = [];
let bulletVelocityY = -10;  // Mermi hızını yavaşlatıyoruz

let alienBombs = [];  // Array to hold bombs shot by aliens
let bombVelocityY = 3;  // Bombaların hızını yavaşlatıyoruz

let score = 0;
let gameOver = false;

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardwidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    shipImg = new Image();
    shipImg.src = "img/ship.png";
    shipImg.onload = function() {
        context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    }

    alienImg = new Image();
    alienImg.src = "img/alien.png";
    createAliens();

    setInterval(fireAlienBombs, 10000); // Set an interval to fire bombs every 10 seconds

    requestAnimationFrame(update);
    document.addEventListener("keydown", moveShip);
    document.addEventListener("keyup", shoot);
}

function update() {
    requestAnimationFrame(update);

    if (gameOver) {
        showGameOver();
        return;  // Stop further updates if game over
    }

    context.clearRect(0, 0, board.width, board.height);

    // Ship
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

    // Aliens
    for (let i = 0; i < alienArray.length; i++) {
        let alien = alienArray[i];
        if (alien.alive) {
            alien.x += alienVelocityX;

            // If alien touches the borders
            if (alien.x + alien.width >= board.width || alien.x <= 0) {
                alienVelocityX *= -1;
                alien.x += alienVelocityX * 2;

                // Move all aliens up by one row
                for (let j = 0; j < alienArray.length; j++) {
                    alienArray[j].y += alienHeight;
                }
            }
            context.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);

            if (alien.y >= ship.y) {
                gameOver = true;
            }
        }
    }

    // Bullets
    for (let i = 0; i < bulletArray.length; i++) {
        let bullet = bulletArray[i];
        bullet.y += bulletVelocityY;
        context.fillStyle = "white";
        context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        // Bullet collision with aliens
        for (let j = 0; j < alienArray.length; j++) {
            let alien = alienArray[j];
            if (!bullet.used && alien.alive && detectCollision(bullet, alien)) {
                bullet.used = true;
                alien.alive = false;
                alienCount--;
                score += 100;
            }
        }
    }

    // Alien bombs
    for (let i = 0; i < alienBombs.length; i++) {
        let bomb = alienBombs[i];
        bomb.y += bombVelocityY;
        context.fillStyle = "red";
        context.fillRect(bomb.x, bomb.y, bomb.width, bomb.height);

        // Bomb collision with ship
        if (detectCollision(bomb, ship)) {
            gameOver = true; // End the game if a bomb hits the ship
        }

        // Remove bombs that go off screen
        if (bomb.y > board.height) {
            alienBombs.splice(i, 1);
            i--;
        }
    }

    // Clear bullets
    while (bulletArray.length > 0 && (bulletArray[0].used || bulletArray[0].y < 0)) {
        bulletArray.shift(); // Removes the first element of the array
    }

    // Next level
    if (alienCount == 0) {
        score += alienColumns * alienRows * 100; // Bonus points :)
        alienColumns = Math.min(alienColumns + 1, columns / 2 - 2); // Cap at 16/2 -2 = 6
        alienRows = Math.min(alienRows + 1, rows - 4);  // Cap at 16-4 = 12
        if (alienVelocityX > 0) {
            alienVelocityX += 0.1; // Increase the alien movement speed towards the right (slower)
        } else {
            alienVelocityX -= 0.1; // Increase the alien movement speed towards the left (slower)
        }
        alienArray = [];
        bulletArray = [];
        createAliens();
    }

    // Score
    context.fillStyle = "white";
    context.font = "16px courier";
    context.fillText(score, 5, 20);
}

function moveShip(e) {
    if (gameOver) {
        return;
    }

    if (e.code == "ArrowLeft" && ship.x - shipVelocityX >= 0) {
        ship.x -= shipVelocityX; // Move left one tile
    } else if (e.code == "ArrowRight" && ship.x + shipVelocityX + ship.width <= board.width) {
        ship.x += shipVelocityX; // Move right one tile
    }
}

function createAliens() {
    for (let c = 0; c < alienColumns; c++) {
        for (let r = 0; r < alienRows; r++) {
            let alien = {
                img: alienImg,
                x: alienX + c * alienWidth,
                y: alienY + r * alienHeight,
                width: alienWidth,
                height: alienHeight,
                alive: true
            }
            alienArray.push(alien);
        }
    }
    alienCount = alienArray.length;
}

function shoot(e) {
    if (gameOver) {
        return;
    }

    if (e.code == "Space") {
        // Shoot
        let bullet = {
            x: ship.x + shipWidth * 15 / 32,
            y: ship.y,
            width: tileSize / 8,
            height: tileSize / 2,
            used: false
        }
        bulletArray.push(bullet);
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   // a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x &&   // a's top right corner passes b's top left corner
           a.y < b.y + b.height &&  // a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;    // a's bottom left corner passes b's top left corner
}

function fireAlienBombs() {
    // Pick a random alien to shoot a bomb
    if (alienArray.length > 0) {
        let randomAlien = alienArray[Math.floor(Math.random() * alienArray.length)];

        if (randomAlien.alive) {
            let bomb = {
                x: randomAlien.x + alienWidth / 2 - tileSize / 16, // Position bomb in the middle of the alien
                y: randomAlien.y + alienHeight, // Start the bomb just below the alien
                width: tileSize / 8,
                height: tileSize / 2,
                alive: true
            };
            alienBombs.push(bomb);
        }
    }
}

function showGameOver() {
    // Display "Game Over" message
    context.fillStyle = "white";
    context.font = "32px Arial";
    context.fillText("GAME OVER", board.width / 4, board.height / 2);

    // Optionally, you can show the score at the end
    context.font = "16px Arial";
    context.fillText("Score: " + score, board.width / 3, board.height / 2 + 40);
}

function restartGame() {
    // Reset all game variables and state
    gameOver = false;
    score = 0;
    ship.x = shipX;
    ship.y = shipY;
    alienArray = [];
    bulletArray = [];
    alienBombs = [];
    alienCount = 0;
    createAliens();  // Recreate aliens
    alienVelocityX = 0.5; // Yabancıların hızını tekrar yavaşlatıyoruz
    alienRows = 2;
    alienColumns = 3;

    requestAnimationFrame(update); // Restart the game loop
}

// Listen for spacebar press to restart the game
document.addEventListener("keydown", function(e) {
    if (gameOver && e.code == "Space") {
        restartGame();
    }
});
