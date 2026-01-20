var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

var game = new Phaser.Game(config);

// Global Variables
var player;
var cursors;
var bullets;
var enemies;
var score = 0;
var scoreText;
var playerHealth = 100;
var healthText;
var gameOver = false;
var gameOverText;

var powerUps;

var miniboss1Spawned = false;
var miniboss2Spawned = false;
var bossSpawned = false;

// Gun Definitions
var guns = [
    {
        name: "Basic Gun",
        fireRate: 300, // Milliseconds between shots
        bulletSpeed: -400,
        unlockCost: 0,
    },
    {
        name: "Double Shot",
        fireRate: 250,
        bulletSpeed: -500,
        unlockCost: 50,
    },
    {
        name: "Rapid Fire",
        fireRate: 150,
        bulletSpeed: -600,
        unlockCost: 150,
    },
    {
        name: "Laser Beam",
        fireRate: 50,
        bulletSpeed: -800,
        unlockCost: 400,
    }
];

var currentGunIndex = 0; // Start with the first gun
var nextGunUnlock = guns[1].unlockCost; //Score required to unlock next weapon

var gunText;

var lastFired = 0; // Time the last bullet was fired
// var fireRate = 200; // Milliseconds between shots - NOW IN GUN DEFINITIONS

function preload() {
    // No assets to load (we'll generate them)
}

function create() {
    // Player (Placeholder)
    player = this.physics.add.sprite(400, 500, null); // No texture initially
    player.setCollideWorldBounds(true);
    player.setSize(32, 32); // Set a size for collision
    player.setDisplaySize(32,32); // Scale display for visibility
    player.setOrigin(0.5);

    // Create a ship-like shape for the player
    var playerGraphic = this.add.graphics();
    playerGraphic.fillStyle(0x32CD32, 1); // LimeGreen
    playerGraphic.beginPath();
    playerGraphic.moveTo(0, -16);  // Top point of triangle
    playerGraphic.lineTo(-16, 16); // Bottom left
    playerGraphic.lineTo(16, 16);  // Bottom right
    playerGraphic.closePath();
    playerGraphic.fillPath();

    playerGraphic.fillStyle(0x008000, 1); //Green
    playerGraphic.fillRect(-12, 10, 24, 12); // Body of the ship

    player.setTexture(playerGraphic.generateTexture('playerTexture', 32, 32));
    playerGraphic.destroy(); //Destroy the graphics object

    // Input
    cursors = this.input.keyboard.createCursorKeys();

    // Bullets
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20,
        enable: false,
        visible: false,
        immovable: true // Bullets don't move when colliding
    });

    var bulletGraphic = this.add.graphics();
    bulletGraphic.fillStyle(0xffffff, 1); // White
    bulletGraphic.fillRect(-2, -8, 4, 16); // Elongated rectangle
    bullets.createMultiple({
        key: bulletGraphic.generateTexture('bulletTexture', 4, 16),
        quantity: 20,
        active: false,
        visible: false
    });
    bulletGraphic.destroy();

    // Enemies
    enemies = this.physics.add.group();
    // Initial Enemy Spawn (Let's spawn 5 initially)
    for (let i = 0; i < 5; i++) {
        spawnEnemy(this);
    }

    // Power-Ups
    powerUps = this.physics.add.group();

    // Collision Detection
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.collider(player, enemies, playerHitEnemy, null, this);
    this.physics.add.overlap(player, powerUps, collectPowerUp, null, this);


    // Score Text
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });

    // Health Text
    healthText = this.add.text(10, 35, 'Health: 100', { fontSize: '20px', fill: '#fff' });

     // Game Over Text
    gameOverText = this.add.dom(400, 300, 'div', 'id="game-over-text"', 'GAME OVER\nClick to Restart');
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false; // Initially hidden

    // Gun Text
    gunText = this.add.text(10, 60, 'Gun: ' + guns[currentGunIndex].name, {fontSize: '20px', fill: '#fff'});

}

function update(time) {
    if (gameOver) {
        return;  //Stop updating if game over
    }

    // Player Movement (as before)
    player.setVelocity(0);

    if (cursors.left.isDown) {
        player.setVelocityX(-300);
    } else if (cursors.right.isDown) {
        player.setVelocityX(300);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-300);
    } else if (cursors.down.isDown) {
        player.setVelocityY(300);
    }

    // Shooting
    if (cursors.space.isDown && time > lastFired) { //Holding space bar to shoot
        fireBullet(time);
    }

    // Enemy Spawning Logic
    if (enemies.countActive(true) < 5 && Phaser.Math.Between(0, 100) < 2) {
        spawnEnemy(this);
    }

    // Boss Spawning Logic
    if (score >= 250 && !miniboss1Spawned) {
        spawnMiniboss(this, 1);
        miniboss1Spawned = true;
    } else if (score >= 500 && !miniboss2Spawned) {
        spawnMiniboss(this, 2);
        miniboss2Spawned = true;
    } else if (score >= 1000 && !bossSpawned) {
        spawnBoss(this);
        bossSpawned = true;
    }

    // Power-Up Spawning
    if (Phaser.Math.Between(0, 500) < 2) {
        spawnPowerUp(this);
    }

    // Gun Unlocking
    if (currentGunIndex < guns.length - 1 && score >= nextGunUnlock){
        currentGunIndex++; //Upgrade the weapon
        nextGunUnlock = (currentGunIndex < guns.length -1) ? guns[currentGunIndex+1].unlockCost : Number.MAX_SAFE_INTEGER; //If has next update its score, else max integer
        gunText.setText('Gun: ' + guns[currentGunIndex].name); //Update text
    }
}

function spawnEnemy(scene) {
    // Create a simple circle for the enemy
    let enemy = enemies.create(Phaser.Math.Between(50, 750), 50, null);
    enemy.setOrigin(0.5);
    const enemySize = Phaser.Math.Between(20,30);
    enemy.setDisplaySize(enemySize, enemySize); //Varying sizes
    enemy.setSize(enemySize, enemySize);

    var enemyGraphic = scene.add.graphics();
    enemyGraphic.fillStyle(Phaser.Display.Color.RandomRGB().color, 1); // Random red-ish color

    enemyGraphic.fillCircle(0,0, enemySize/2);
    enemy.setTexture(enemyGraphic.generateTexture('enemyTexture', enemySize,enemySize));
    enemyGraphic.destroy();

    const enemySpeed = Phaser.Math.Between(40, 80);
    enemy.setVelocityY(enemySpeed); //Varying Speeds
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1);

    // Enemy Properties
    enemy.pointValue = 5; // Basic enemy gives 5 points

    //New Enemy AI - Random Direction Changes
    enemy.directionChangeTimer = scene.time.addEvent({
        delay: Phaser.Math.Between(1000, 3000), //Change Direction every 1-3 seconds
        callback: () => {
            enemy.setVelocityX(Phaser.Math.Between(-100, 100)); //Random X velocity
        },
        loop: true
    });

    return enemy;
}

function spawnMiniboss(scene, bossNumber) {
    let miniboss = enemies.create(400, 50, null);
    miniboss.setOrigin(0.5);
    miniboss.setDisplaySize(48, 48);

    var minibossGraphic = scene.add.graphics();
    minibossGraphic.fillStyle(0xffa500, 1); // Orange
    minibossGraphic.fillCircle(0,0, 24); // Circle

    miniboss.setTexture(minibossGraphic.generateTexture('minibossTexture'+bossNumber, 48, 48));
    minibossGraphic.destroy();

    miniboss.setVelocityY(30);
    miniboss.setCollideWorldBounds(true);
    miniboss.setBounce(1);

     // Enemy Properties
    miniboss.pointValue = 100; // Miniboss gives 100 points
    return miniboss;
}

function spawnBoss(scene) {
   let boss = enemies.create(400, 50, null);
    boss.setOrigin(0.5);
    boss.setDisplaySize(64, 64);
    var bossGraphic = scene.add.graphics();
    bossGraphic.fillStyle(0x0000ff, 1); // Blue
    bossGraphic.fillCircle(0,0, 32); // Circle

    boss.setTexture(bossGraphic.generateTexture('bossTexture', 64, 64));
    bossGraphic.destroy();

    boss.setVelocityY(20);
    boss.setCollideWorldBounds(true);
    boss.setBounce(1);

    // Enemy Properties
    boss.pointValue = 500; // Boss gives 500 points
    return boss;
}

function fireBullet(time) {
    const currentGun = guns[currentGunIndex];
    var bullet = bullets.get();
    if (bullet) {
        bullet.enableBody(true, player.x, player.y - 20, true, true);
        bullet.setVelocityY(currentGun.bulletSpeed);
        lastFired = time + currentGun.fireRate;
    }
}

function hitEnemy(bullet, enemy) {
    bullet.disableBody(true, true);
    const points = enemy.pointValue;
    enemy.destroy();
    updateScore(points);
}

function playerHitEnemy(player, enemy) {
    if (gameOver) return;
    enemy.destroy();

    playerHealth -= 10;
    healthText.setText('Health: ' + playerHealth);

    if (playerHealth <= 0) {
        endGame(this);
    }
}

function updateScore(points) {
    score += points;
    scoreText.setText('Score: ' + score);
}

function spawnPowerUp(scene) {
  let powerUp = powerUps.create(Phaser.Math.Between(50, 750), 50, null);
    powerUp.setOrigin(0.5);
    powerUp.setDisplaySize(20, 20);

    // Create a star shape for the power-up
    var powerUpGraphic = scene.add.graphics();
    powerUpGraphic.fillStyle(0xffff00, 1); // Yellow

    // Define the points of the star (you can adjust these values)
    const points = 5; // Number of points for the star
    const outerRadius = 10;
    const innerRadius = 5;
    powerUpGraphic.beginPath();
    for (let i = 0; i < 2 * points; i++) {
        const radius = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = Math.PI * i / points - Math.PI / 2; // Start at top
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) {
            powerUpGraphic.moveTo(x, y);
        } else {
            powerUpGraphic.lineTo(x, y);
        }
    }
    powerUpGraphic.closePath();
    powerUpGraphic.fillPath();

    powerUp.setTexture(powerUpGraphic.generateTexture('powerUpTexture', 20, 20));
    powerUpGraphic.destroy();

    powerUp.setVelocityY(50);
}

function collectPowerUp(player, powerUp) {
    powerUp.destroy();
    playerHealth = Math.min(100, playerHealth + 20); //Heal Player, max 100
    healthText.setText('Health: ' + playerHealth);
}

function endGame(scene) {
    gameOver = true;
    player.destroy();
    enemies.getChildren().forEach(enemy => enemy.destroy()); // Destroy remaining enemies

    gameOverText.setVisible(true); //Show the game over text
    scene.physics.pause(); // Stop the physics simulation
}

function restartGame() {
    gameOver = false;
    playerHealth = 100; // Reset health
    score = 0; // Reset score
    currentGunIndex = 0; // Reset to basic gun
    gunText.setText('Gun: ' + guns[currentGunIndex].name);
    lastFired = 0; // Reset the lastFired timer

    miniboss1Spawned = false;
    miniboss2Spawned = false;
    bossSpawned = false;

    this.scene.restart(); //Restart the scene
}
