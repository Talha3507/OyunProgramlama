const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas boyutlarını sabit değişkenler olarak tanımlayalım
const CANVAS_WIDTH = 750;
const CANVAS_HEIGHT = 750;
const GRID_SIZE = CANVAS_WIDTH;
const CELL_SIZE = 30;
const PLAYER_SIZE = CELL_SIZE; // Karakteri tam hücre boyutuna ayarla
const BOMB_RADIUS = 1; // 2'den 1'e düşürüldü - her yöne 1 hücre etki edecek
const BOMB_COOLDOWN = 90; // 1.5 saniyelik bekleme süresi (60fps'de)
const POWERUP_DURATION = 600; // 10 saniye (60fps'de)
const POWERUP_CHANCE = 0.15; // Kırılan duvarlardan %15 şansla bonus çıkma ihtimali
const POINTS_PER_BLOCK = 10; // Kırılan her blok için puan
const POINTS_PER_ENEMY = 100; // Düşman öldürme puanı (50'den 100'e çıkarıldı)
const ENEMY_COUNT = 4; // Düşman sayısı
const ENEMY_MOVE_INTERVAL = 60; // Her 1 saniyede bir hareket et (60fps'de)
const ANIMATION_SPEED = 8; // Her 8 frame'de bir sprite değişecek
const GHOST_SPEED = 1; // Ruhların yükselme hızı (daha yavaş)

// Karakter sprite'ını yükle
const playerImage = new Image();
playerImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJhSURBVFiF7ZbLaxNRGMXPuXcmTZq0TZ3Y2KbVtqhYH1DqY6GgCLpwIbgQxKULceHahf4BrgQXbgQFQfBBEVcKIqgIIj4oCFqkWvGBti+pit5mJnPvdVGSzkyePmZT8GzuZeZ+53fP+e4dgB122GaQ/wVQtJBhGAOGYQxsB4AqpVSllLJyBTBN86Zt2y9s2/7MzH2pVKrfNM1jruvudV33quu6E8z8NJlM7ssJwHXdG4j4GBEbiHgdEV8i4n1EfI6IjxDxDiJeQ8SbmUzmWk4AQohpIjpORFcopQaVUoeVUseUUseVUkeVUkeYeYCZT+YMkEwmdymlLhHRSSI6Q0QDRHSSiE4ppU4rpQaZ+QwRnSOiC9ls9mBOAMxcR0TnmfkcEZ0lojPMfJ6ILhLRJWa+zMyXmPkiEfVnMpnTOQEAQBQRe5i5l5l7EbEXEXsQsRsRuxGxGxG7mLkLETuZuTOVSh3OGUBKOQEAkwAwBQDTADANAFMA8B4ApgBgEgDeAcAbAHiVTqf35QQAADoiVgNAAwA0AkAjANQDQAMANABAAwDUAUAtItYCQE0ikajJGQARGRGrAKAaAKoBoAoAqgCgCgAqAaASACoBoBwAyhCxLB6Pl+UEwMwMAKWIWAoApQBQCgAlAFACAMUAUAwARQBQCAD5iJgfj8fzcwIAAEDEPESMIWIeIsYQMYaIMUTMQ8QYIkYRMYqIEUSMIGIYEcOIGLIsK5QzwA67Y/sNvKFa7Q2/UEUEAAAAASUVORK5CYII=';

playerImage.onload = function() {
    console.log("Karakter resmi yüklendi!");
};

playerImage.onerror = function() {
    console.error("Karakter resmi yüklenemedi!");
};

// Canvas boyutlarını ayarlayalım
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let gameOver = false;
let lastBombTime = 0; // Son bombanın konulduğu zaman
let currentTime = 0; // Geçen süreyi takip etmek için sayaç
let extraBombs = 0; // Ekstra bomba sayısı
let score = 0; // Oyuncunun puanı
let lastMoveTime = 0; // Son hareket zamanı
const INACTIVITY_TIMEOUT = 900; // 15 saniye (60fps'de)
let player = {
    x: CELL_SIZE,
    y: CELL_SIZE,
    size: PLAYER_SIZE,
    direction: 'down', // Karakterin yönü (down, up, left, right)
    frameIndex: 0, // Animasyon için frame indeksi
    frameCount: 0 // Frame sayacı
};
let playerGhost = null; // Oyuncu ruhu için yeni değişken
let gameOverTimer = 0; // Game over ekranı için zamanlayıcı

let bombs = [];
let blocks = [];
let explosions = []; // Patlama efektleri için yeni dizi
let powerUps = []; // Ekrandaki bonusları tutacak dizi
let enemies = []; // Düşmanları tutacak dizi
let ghostEffects = []; // Düşman ruhları için yeni dizi
let floatingScores = []; // Uçuşan puanlar için yeni dizi

// Initialize blocks
function initializeBlocks() {
    blocks = [];
    
    // Önce kenarları kırılamaz duvarlarla kapla
    for (let y = 0; y < GRID_SIZE; y += CELL_SIZE) {
        for (let x = 0; x < GRID_SIZE; x += CELL_SIZE) {
            // Kenarları kontrol et (sol, sağ, üst, alt)
            if (x === 0 || x === GRID_SIZE - CELL_SIZE || y === 0 || y === GRID_SIZE - CELL_SIZE) {
                blocks.push({
                    x: x,
                    y: y,
                    breakable: false
                });
            }
        }
    }

    // Sonra iç kısımdaki rastgele duvarları ekle
    for (let y = CELL_SIZE; y < GRID_SIZE - CELL_SIZE; y += CELL_SIZE) {
        for (let x = CELL_SIZE; x < GRID_SIZE - CELL_SIZE; x += CELL_SIZE) {
            // Başlangıç alanını temiz tut (3x3'lük bir alan)
            if (x <= CELL_SIZE * 2 && y <= CELL_SIZE * 2) {
                continue; // Başlangıç alanına duvar koyma
            }

            // Create random blocks, some breakable some not
            if (Math.random() < 0.3) {
                blocks.push({
                    x: x,
                    y: y,
                    breakable: Math.random() < 0.7
                });
            }
        }
    }
}

// Initialize enemies
function initializeEnemies() {
    enemies = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (GRID_SIZE - 2 * CELL_SIZE) / CELL_SIZE) * CELL_SIZE + CELL_SIZE;
            y = Math.floor(Math.random() * (GRID_SIZE - 2 * CELL_SIZE) / CELL_SIZE) * CELL_SIZE + CELL_SIZE;
        } while (
            // Oyuncudan uzakta başlat
            (Math.abs(x - player.x) < CELL_SIZE * 3 && Math.abs(y - player.y) < CELL_SIZE * 3) ||
            // Diğer düşmanlarla çakışma kontrolü
            enemies.some(enemy => enemy.x === x && enemy.y === y) ||
            // Bloklarla çakışma kontrolü
            blocks.some(block => block.x === x && block.y === y)
        );

        enemies.push({
            x: x,
            y: y,
            size: CELL_SIZE,
            lastMove: 0
        });
    }
}

// Draw everything
function draw() {
    // Clear canvas and set background color
    ctx.fillStyle = '#1E90FF'; // Daha koyu mavi (Dodger Blue)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    
    // Dikey çizgiler
    for (let x = 0; x <= canvas.width; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Yatay çizgiler
    for (let y = 0; y <= canvas.height; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw explosions
    explosions.forEach(explosion => {
        // Patlama merkezi (parlak sarı)
        const centerGradient = ctx.createRadialGradient(
            explosion.x + CELL_SIZE/2, explosion.y + CELL_SIZE/2,
            0,
            explosion.x + CELL_SIZE/2, explosion.y + CELL_SIZE/2,
            CELL_SIZE * explosion.radius
        );
        centerGradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
        centerGradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.6)');
        centerGradient.addColorStop(0.6, 'rgba(255, 69, 0, 0.4)');
        centerGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        // Yatay patlama
        ctx.fillStyle = centerGradient;
        for (let x = explosion.x - (explosion.radius * CELL_SIZE); x <= explosion.x + (explosion.radius * CELL_SIZE); x += CELL_SIZE) {
            if (x >= 0 && x < canvas.width) {
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE/2, explosion.y + CELL_SIZE/2, CELL_SIZE/2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Dikey patlama
        for (let y = explosion.y - (explosion.radius * CELL_SIZE); y <= explosion.y + (explosion.radius * CELL_SIZE); y += CELL_SIZE) {
            if (y >= 0 && y < canvas.height) {
                ctx.beginPath();
                ctx.arc(explosion.x + CELL_SIZE/2, y + CELL_SIZE/2, CELL_SIZE/2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Patlama dalgası efekti
        if (explosion.timer > 10) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(explosion.x + CELL_SIZE/2, explosion.y + CELL_SIZE/2, 
                    (15 - explosion.timer) * CELL_SIZE/4, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Draw blocks
    blocks.forEach(block => {
        if (block.breakable) {
            // Kırılabilen duvarlar için tuğla görünümü
            ctx.fillStyle = '#8B4513'; // Ana tuğla rengi
            ctx.fillRect(block.x, block.y, CELL_SIZE, CELL_SIZE);
            
            // Tuğla dokusu
            ctx.fillStyle = '#A0522D'; // Daha açık tuğla rengi (detaylar için)
            
            // Yatay tuğla çizgileri
            ctx.fillRect(block.x, block.y + CELL_SIZE/2 - 1, CELL_SIZE, 2);
            
            // Dikey tuğla çizgileri (üst yarı)
            ctx.fillRect(block.x + CELL_SIZE/2 - 1, block.y, 2, CELL_SIZE/2 - 1);
            
            // Dikey tuğla çizgileri (alt yarı, kaydırılmış)
            ctx.fillRect(block.x + CELL_SIZE/4 - 1, block.y + CELL_SIZE/2 + 1, 2, CELL_SIZE/2 - 1);
            ctx.fillRect(block.x + CELL_SIZE*3/4 - 1, block.y + CELL_SIZE/2 + 1, 2, CELL_SIZE/2 - 1);
            
            // Tuğla gölgeleri
            ctx.fillStyle = '#6B2D13'; // Daha koyu tuğla rengi (gölgeler için)
            ctx.fillRect(block.x, block.y + CELL_SIZE/2, CELL_SIZE, 1);
            ctx.fillRect(block.x + CELL_SIZE/2, block.y, 1, CELL_SIZE/2);
            ctx.fillRect(block.x + CELL_SIZE/4, block.y + CELL_SIZE/2, 1, CELL_SIZE/2);
            ctx.fillRect(block.x + CELL_SIZE*3/4, block.y + CELL_SIZE/2, 1, CELL_SIZE/2);
            
            // Kenar çizgisi
            ctx.strokeStyle = '#5C1F0D';
            ctx.lineWidth = 1;
            ctx.strokeRect(block.x, block.y, CELL_SIZE, CELL_SIZE);
        } else {
            // Kırılamayan duvarlar için taş görünümü
            ctx.fillStyle = '#696969'; // Koyu gri arka plan
            ctx.fillRect(block.x, block.y, CELL_SIZE, CELL_SIZE);
            
            // Taş dokusu için detaylar
            ctx.fillStyle = '#808080'; // Açık gri detaylar
            
            // Sol üst köşe detayı
            ctx.beginPath();
            ctx.moveTo(block.x, block.y);
            ctx.lineTo(block.x + 10, block.y);
            ctx.lineTo(block.x + 5, block.y + 10);
            ctx.fill();
            
            // Sağ alt köşe detayı
            ctx.beginPath();
            ctx.moveTo(block.x + CELL_SIZE, block.y + CELL_SIZE);
            ctx.lineTo(block.x + CELL_SIZE - 10, block.y + CELL_SIZE);
            ctx.lineTo(block.x + CELL_SIZE - 5, block.y + CELL_SIZE - 10);
            ctx.fill();
            
            // Orta kısım detayı
            ctx.beginPath();
            ctx.moveTo(block.x + 15, block.y + 15);
            ctx.lineTo(block.x + 25, block.y + 10);
            ctx.lineTo(block.x + 20, block.y + 20);
            ctx.fill();
            
            // Kenar çizgisi
            ctx.strokeStyle = '#404040';
            ctx.lineWidth = 2;
            ctx.strokeRect(block.x, block.y, CELL_SIZE, CELL_SIZE);
        }
    });

    // Draw power-ups
    powerUps.forEach(powerUp => {
        // Yıldız çizimi için merkez nokta
        const centerX = powerUp.x + CELL_SIZE/2;
        const centerY = powerUp.y + CELL_SIZE/2;
        const outerRadius = CELL_SIZE/3;
        const innerRadius = outerRadius/2;
        
        // Yıldız için açı hesaplamaları
        const rotation = currentTime * 0.02; // Yıldızı döndür
        const points = 5; // 5 köşeli yıldız
        
        // Ana yıldız çizimi
        ctx.beginPath();
        for(let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / points) + rotation;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        // Yıldız gradyanı
        const gradient = ctx.createRadialGradient(
            centerX, centerY, innerRadius/2,
            centerX, centerY, outerRadius
        );
        gradient.addColorStop(0, '#FFD700'); // Altın sarısı merkez
        gradient.addColorStop(0.5, '#FFA500'); // Turuncu orta
        gradient.addColorStop(1, '#FFD700'); // Altın sarısı dış
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Parlama efekti
        const glowSize = (Math.sin(currentTime * 0.1) + 1) * 5; // Yanıp sönen efekt
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Dış parlama
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 3 + glowSize;
        ctx.stroke();
        
        // İç parlama
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius/2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    });

    // Draw bombs
    bombs.forEach(bomb => {
        // Ana bomba gövdesi (siyah yuvarlak)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(bomb.x + CELL_SIZE/2, bomb.y + CELL_SIZE/2, CELL_SIZE/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Bombanın üst kısmı (gri)
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.arc(bomb.x + CELL_SIZE/2, bomb.y + CELL_SIZE/3, CELL_SIZE/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Fitil (kahverengi)
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bomb.x + CELL_SIZE/2, bomb.y + CELL_SIZE/4);
        ctx.quadraticCurveTo(
            bomb.x + CELL_SIZE/2 + 10, 
            bomb.y + CELL_SIZE/6,
            bomb.x + CELL_SIZE/2 + 15, 
            bomb.y + CELL_SIZE/4
        );
        ctx.stroke();
        
        // Yanma efekti (kırmızı-sarı)
        if (bomb.timer < 30) { // Son 0.5 saniye
            const gradient = ctx.createRadialGradient(
                bomb.x + CELL_SIZE/2 + 15, bomb.y + CELL_SIZE/4,
                0,
                bomb.x + CELL_SIZE/2 + 15, bomb.y + CELL_SIZE/4,
                5
            );
            gradient.addColorStop(0, '#FF0000');
            gradient.addColorStop(1, '#FFD700');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(bomb.x + CELL_SIZE/2 + 15, bomb.y + CELL_SIZE/4, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw player
    drawPlayer();

    // Draw enemies
    enemies.forEach(enemy => {
        // Ana gövde (kırmızı)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
        
        // Kenar çizgisi
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x, enemy.y, enemy.size, enemy.size);
        
        // Kızgın gözler (beyaz)
        const eyeSize = enemy.size * 0.15;
        const eyeY = enemy.y + enemy.size * 0.3;
        
        // Sol göz
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(enemy.x + enemy.size * 0.2, eyeY, eyeSize, eyeSize);
        
        // Sağ göz
        ctx.fillRect(enemy.x + enemy.size * 0.6, eyeY, eyeSize, eyeSize);
        
        // Göz bebekleri (siyah)
        ctx.fillStyle = '#000000';
        ctx.fillRect(enemy.x + enemy.size * 0.25, eyeY + eyeSize * 0.2, eyeSize * 0.6, eyeSize * 0.6);
        ctx.fillRect(enemy.x + enemy.size * 0.65, eyeY + eyeSize * 0.2, eyeSize * 0.6, eyeSize * 0.6);
        
        // Kızgın kaşlar
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Sol kaş
        ctx.moveTo(enemy.x + enemy.size * 0.2, eyeY - 5);
        ctx.lineTo(enemy.x + enemy.size * 0.4, eyeY - 10);
        ctx.stroke();
        // Sağ kaş
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.size * 0.6, eyeY - 10);
        ctx.lineTo(enemy.x + enemy.size * 0.8, eyeY - 5);
        ctx.stroke();
        
        // Kızgın ağız
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.size * 0.3, enemy.y + enemy.size * 0.7);
        ctx.lineTo(enemy.x + enemy.size * 0.5, enemy.y + enemy.size * 0.8);
        ctx.lineTo(enemy.x + enemy.size * 0.7, enemy.y + enemy.size * 0.7);
        ctx.stroke();
    });

    // Draw ghost effects
    ghostEffects.forEach(ghost => {
        ctx.save();
        ctx.globalAlpha = ghost.alpha;
        
        // Ruh şekli (beyaz, yarı saydam)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.size/2, ghost.y + ghost.size/2, ghost.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ruh detayları
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        
        // Gözler
        const eyeSize = ghost.size * 0.15;
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.size * 0.3, ghost.y + ghost.size * 0.4, eyeSize, 0, Math.PI * 2);
        ctx.arc(ghost.x + ghost.size * 0.7, ghost.y + ghost.size * 0.4, eyeSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ağız
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.size/2, ghost.y + ghost.size * 0.6, ghost.size * 0.2, 0, Math.PI);
        ctx.stroke();
        
        // Dalgalanma efekti
        const wave = Math.sin(currentTime * 0.2) * 2;
        ctx.beginPath();
        ctx.moveTo(ghost.x, ghost.y + ghost.size);
        ctx.quadraticCurveTo(
            ghost.x + ghost.size/2, ghost.y + ghost.size + wave,
            ghost.x + ghost.size, ghost.y + ghost.size
        );
        ctx.stroke();
        
        ctx.restore();
    });

    // Draw player ghost if exists
    if (playerGhost) {
        ctx.save();
        ctx.globalAlpha = playerGhost.alpha;
        
        // Ruh şekli (beyaz, yarı saydam)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(playerGhost.x + playerGhost.size/2, playerGhost.y + playerGhost.size/2, playerGhost.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ruh detayları
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        
        // Gözler
        const eyeSize = playerGhost.size * 0.15;
        ctx.beginPath();
        ctx.arc(playerGhost.x + playerGhost.size * 0.3, playerGhost.y + playerGhost.size * 0.4, eyeSize, 0, Math.PI * 2);
        ctx.arc(playerGhost.x + playerGhost.size * 0.7, playerGhost.y + playerGhost.size * 0.4, eyeSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ağız
        ctx.beginPath();
        ctx.arc(playerGhost.x + playerGhost.size/2, playerGhost.y + playerGhost.size * 0.6, playerGhost.size * 0.2, 0, Math.PI);
        ctx.stroke();
        
        // Dalgalanma efekti
        const wave = Math.sin(currentTime * 0.2) * 2;
        ctx.beginPath();
        ctx.moveTo(playerGhost.x, playerGhost.y + playerGhost.size);
        ctx.quadraticCurveTo(
            playerGhost.x + playerGhost.size/2, playerGhost.y + playerGhost.size + wave,
            playerGhost.x + playerGhost.size, playerGhost.y + playerGhost.size
        );
        ctx.stroke();
        
        ctx.restore();
    }

    // Draw floating scores
    floatingScores.forEach(score => {
        ctx.save();
        ctx.globalAlpha = score.alpha;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+${score.points}`, score.x, score.y);
        ctx.restore();
    });

    // Draw score at the top of the screen
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Puan: ${score}`, 10, 35);

    // Draw extra bombs count
    if (extraBombs > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '24px Arial';
        ctx.fillText(`Ekstra Bomba: ${extraBombs}`, 180, 35);
    }

    // Draw game over screen only after ghost disappears
    if (gameOver && !playerGhost) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFF';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Game Over! Score: ${score}`, canvas.width/2, canvas.height/2 - 50);
        
        // Try Again butonu
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = canvas.width/2 - buttonWidth/2;
        const buttonY = canvas.height/2 + 20;
        
        // Buton arka planı
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Buton kenarlığı
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Buton yazısı
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Try Again', canvas.width/2, buttonY + 32);
    }
}

// Draw player function
function drawPlayer() {
    // Eğer oyun bittiyse karakteri çizme
    if (gameOver) return;

    // Ana gövde (beyaz)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(player.x, player.y, player.size, player.size);
    
    // Kenar çizgisi
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.size, player.size);
    
    // Kafa (açık mavi)
    const headSize = player.size * 0.5; // Kafayı biraz daha küçült
    const headX = player.x + (player.size - headSize) / 2;
    const headY = player.y + player.size * 0.1;
    ctx.fillStyle = '#87CEFA';
    ctx.fillRect(headX, headY, headSize, headSize);
    ctx.strokeRect(headX, headY, headSize, headSize);
    
    // Gözler (siyah)
    const eyeSize = player.size * 0.12; // Gözleri biraz daha küçült
    const eyeY = headY + headSize * 0.3;
    
    // Karakterin baktığı yöne göre gözleri çiz
    switch(player.direction) {
        case 'left':
            ctx.fillStyle = '#000000';
            ctx.fillRect(headX + headSize * 0.2, eyeY, eyeSize, eyeSize);
            ctx.fillRect(headX + headSize * 0.2, eyeY + eyeSize * 1.5, eyeSize, eyeSize);
            break;
        case 'right':
            ctx.fillStyle = '#000000';
            ctx.fillRect(headX + headSize * 0.6, eyeY, eyeSize, eyeSize);
            ctx.fillRect(headX + headSize * 0.6, eyeY + eyeSize * 1.5, eyeSize, eyeSize);
            break;
        case 'up':
            ctx.fillStyle = '#000000';
            ctx.fillRect(headX + headSize * 0.2, eyeY, eyeSize, eyeSize);
            ctx.fillRect(headX + headSize * 0.6, eyeY, eyeSize, eyeSize);
            break;
        case 'down':
            ctx.fillStyle = '#000000';
            ctx.fillRect(headX + headSize * 0.2, eyeY + eyeSize * 1.5, eyeSize, eyeSize);
            ctx.fillRect(headX + headSize * 0.6, eyeY + eyeSize * 1.5, eyeSize, eyeSize);
            break;
    }
}

// Check collisions
function checkCollision(x, y) {
    // Karakterin merkez noktası
    const centerX = x + player.size / 2;
    const centerY = y + player.size / 2;
    
    // Karakterin grid pozisyonları
    const gridX = Math.floor(centerX / CELL_SIZE);
    const gridY = Math.floor(centerY / CELL_SIZE);
    
    // Çevre grid hücrelerini kontrol et
    for (let checkY = gridY - 1; checkY <= gridY + 1; checkY++) {
        for (let checkX = gridX - 1; checkX <= gridX + 1; checkX++) {
            // Grid koordinatlarını piksel koordinatlarına çevir
            const blockX = checkX * CELL_SIZE;
            const blockY = checkY * CELL_SIZE;
            
            // Bu konumda bir blok var mı kontrol et
            const hasBlock = blocks.some(block => block.x === blockX && block.y === blockY);
            
            if (hasBlock) {
                // Eğer blok varsa, karakterin bu blokla çarpışıp çarpışmadığını kontrol et
                const overlapX = Math.abs(centerX - (blockX + CELL_SIZE / 2)) < (player.size + CELL_SIZE) / 2 - 5;
                const overlapY = Math.abs(centerY - (blockY + CELL_SIZE / 2)) < (player.size + CELL_SIZE) / 2 - 5;
                
                if (overlapX && overlapY) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Handle bomb explosions
function explodeBomb(bomb) {
    // Bonus aktifken bomba yarıçapını artır
    const currentBombRadius = extraBombs > 0 ? 2 : BOMB_RADIUS;

    // Patlama efekti ekle
    explosions.push({
        x: bomb.x,
        y: bomb.y,
        timer: 15,
        radius: currentBombRadius
    });

    // Check if player is in explosion radius
    const playerCenterX = player.x + player.size/2;
    const playerCenterY = player.y + player.size/2;
    const bombCenterX = bomb.x + CELL_SIZE/2;
    const bombCenterY = bomb.y + CELL_SIZE/2;

    // Yatay ve dikey kontrol
    const horizontalDistance = Math.abs(playerCenterX - bombCenterX);
    const verticalDistance = Math.abs(playerCenterY - bombCenterY);
    
    if ((horizontalDistance <= currentBombRadius * CELL_SIZE && verticalDistance < CELL_SIZE/2) || 
        (verticalDistance <= currentBombRadius * CELL_SIZE && horizontalDistance < CELL_SIZE/2)) {
        // Oyuncu öldüğünde ruh efekti ekle
        playerGhost = {
            x: player.x,
            y: player.y,
            size: player.size,
            timer: 30,
            alpha: 1,
            speed: GHOST_SPEED
        };
        gameOver = true;
        gameOverTimer = 30; // Game over ekranı için zamanlayıcıyı başlat
    }

    // Check if enemies are in explosion radius and remove them
    let enemiesBeforeExplosion = enemies.length;
    let enemiesKilled = 0;
    enemies = enemies.filter(enemy => {
        const enemyCenterX = enemy.x + enemy.size/2;
        const enemyCenterY = enemy.y + enemy.size/2;
        
        const horizontalDistance = Math.abs(enemyCenterX - bombCenterX);
        const verticalDistance = Math.abs(enemyCenterY - bombCenterY);
        
        const isInBlastRange = (horizontalDistance <= currentBombRadius * CELL_SIZE && verticalDistance < CELL_SIZE/2) || 
                              (verticalDistance <= currentBombRadius * CELL_SIZE && horizontalDistance < CELL_SIZE/2);
        
        if (isInBlastRange) {
            enemiesKilled++;
            // Ruh efekti ekle
            ghostEffects.push({
                x: enemy.x,
                y: enemy.y,
                size: enemy.size,
                timer: 30,
                alpha: 1,
                speed: GHOST_SPEED
            });
            return false; // Düşmanı kaldır
        }
        return true;
    });

    // Her öldürülen düşman için 20 puan ver
    if (enemiesKilled > 0) {
        score += enemiesKilled * 20;
        // Uçuşan puan ekle
        floatingScores.push({
            x: bomb.x + CELL_SIZE/2,
            y: bomb.y,
            points: enemiesKilled * 20,
            timer: 30,
            alpha: 1
        });
    }

    // Eğer tüm düşmanlar öldüyse yeniden doğur
    if (enemies.length === 0 && enemiesBeforeExplosion > 0) {
        initializeEnemies();
    }

    // Remove breakable blocks and possibly spawn power-ups
    let blocksDestroyed = 0;
    blocks = blocks.filter(block => {
        const blockCenterX = block.x + CELL_SIZE/2;
        const blockCenterY = block.y + CELL_SIZE/2;
        
        const horizontalDistance = Math.abs(blockCenterX - bombCenterX);
        const verticalDistance = Math.abs(blockCenterY - bombCenterY);
        
        const isInBlastRange = (horizontalDistance <= currentBombRadius * CELL_SIZE && verticalDistance < CELL_SIZE/2) || 
                              (verticalDistance <= currentBombRadius * CELL_SIZE && horizontalDistance < CELL_SIZE/2);
        
        if (isInBlastRange && block.breakable) {
            blocksDestroyed++;
            if (Math.random() < POWERUP_CHANCE) {
                powerUps.push({
                    x: block.x,
                    y: block.y
                });
            }
            return false;
        }
        return true;
    });

    score += blocksDestroyed * POINTS_PER_BLOCK;
}

// Check if player collected any power-up
function checkPowerUpCollection() {
    powerUps = powerUps.filter(powerUp => {
        const collected = 
            player.x < powerUp.x + CELL_SIZE &&
            player.x + player.size > powerUp.x &&
            player.y < powerUp.y + CELL_SIZE &&
            player.y + player.size > powerUp.y;

        if (collected) {
            extraBombs += 4; // 4 ekstra bomba ekle
        }

        return !collected;
    });
}

// Update enemy positions
function updateEnemies() {
    enemies.forEach(enemy => {
        if (currentTime - enemy.lastMove >= ENEMY_MOVE_INTERVAL) { // Hareket hızını normal seviyeye döndür
            // Oyuncuya doğru hareket etmek için yön hesaplama
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            
            // En kısa yolu seç
            let direction;
            if (Math.abs(dx) > Math.abs(dy)) {
                // Yatay hareket
                direction = dx > 0 ? { dx: CELL_SIZE, dy: 0 } : { dx: -CELL_SIZE, dy: 0 };
            } else {
                // Dikey hareket
                direction = dy > 0 ? { dx: 0, dy: CELL_SIZE } : { dx: 0, dy: -CELL_SIZE };
            }
            
            // %30 olasılıkla rastgele hareket et
            if (Math.random() < 0.3) {
                const directions = [
                    { dx: CELL_SIZE, dy: 0 },  // sağ
                    { dx: -CELL_SIZE, dy: 0 }, // sol
                    { dx: 0, dy: CELL_SIZE },  // aşağı
                    { dx: 0, dy: -CELL_SIZE }  // yukarı
                ];
                direction = directions[Math.floor(Math.random() * directions.length)];
            }
            
            const newX = enemy.x + direction.dx;
            const newY = enemy.y + direction.dy;

            // Sınırları ve çarpışmaları kontrol et
            if (newX >= CELL_SIZE && newX < GRID_SIZE - CELL_SIZE &&
                newY >= CELL_SIZE && newY < GRID_SIZE - CELL_SIZE &&
                !blocks.some(block => block.x === newX && block.y === newY) &&
                !enemies.some(other => other !== enemy && other.x === newX && other.y === newY)) {
                enemy.x = newX;
                enemy.y = newY;
            }
            enemy.lastMove = currentTime;
        }
    });

    // Düşmanlarla çarpışma kontrolü
    enemies.forEach(enemy => {
        if (player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y) {
            // Oyuncu öldüğünde ruh efekti ekle
            playerGhost = {
                x: player.x,
                y: player.y,
                size: player.size,
                timer: 30,
                alpha: 1,
                speed: GHOST_SPEED
            };
            gameOver = true;
            gameOverTimer = 30; // Game over ekranı için zamanlayıcıyı başlat
        }
    });
}

// Game loop
function gameLoop() {
    if (!gameOver) {
        currentTime++;

        // Karakter hareketsizlik kontrolü
        if (currentTime - lastMoveTime >= INACTIVITY_TIMEOUT) {
            gameOver = true;
        }

        // Update power-up status
        checkPowerUpCollection();

        // Update enemies
        updateEnemies();

        // Update bombs
        bombs.forEach((bomb, index) => {
            bomb.timer--;
            if (bomb.timer <= 0) {
                explodeBomb(bomb);
                bombs.splice(index, 1);
            }
        });

        // Update explosions
        explosions.forEach((explosion, index) => {
            explosion.timer--;
            if (explosion.timer <= 0) {
                explosions.splice(index, 1);
            }
        });

        // Update ghost effects
        ghostEffects.forEach((ghost, index) => {
            ghost.timer--;
            ghost.alpha = ghost.timer / 30;
            ghost.y -= ghost.speed;
            if (ghost.timer <= 0) {
                ghostEffects.splice(index, 1);
            }
        });

        // Update floating scores
        floatingScores.forEach((score, index) => {
            score.timer--;
            score.alpha = score.timer / 30;
            score.y -= 2; // Yukarı doğru hareket
            if (score.timer <= 0) {
                floatingScores.splice(index, 1);
            }
        });
    } else {
        // Game over durumunda oyuncu ruhunu güncelle
        if (playerGhost) {
            playerGhost.timer--;
            playerGhost.alpha = playerGhost.timer / 30;
            playerGhost.y -= playerGhost.speed;
            
            if (playerGhost.timer <= 0) {
                playerGhost = null;
            }
        }
        
        // Game over ekranı için zamanlayıcıyı güncelle
        if (gameOverTimer > 0) {
            gameOverTimer--;
        }
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Handle keyboard input
document.addEventListener('keydown', (e) => {
    if (gameOver && e.code === 'Space' && !playerGhost) { // Sadece ruh kaybolduktan sonra yeniden başlat
        // Restart game
        gameOver = false;
        player.x = CELL_SIZE;
        player.y = CELL_SIZE;
        bombs = [];
        explosions = [];
        powerUps = [];
        extraBombs = 0;
        score = 0;
        currentTime = 0;
        lastBombTime = 0;
        lastMoveTime = 0;
        playerGhost = null;
        gameOverTimer = 0;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        initializeBlocks();
        initializeEnemies();
        return;
    }

    if (gameOver) return;

    const speed = CELL_SIZE;
    let newX = player.x;
    let newY = player.y;
    let moved = false; // Hareket edildi mi kontrolü

    switch(e.code) {
        case 'ArrowLeft':
            newX -= speed;
            player.direction = 'left';
            moved = true;
            break;
        case 'ArrowRight':
            newX += speed;
            player.direction = 'right';
            moved = true;
            break;
        case 'ArrowUp':
            newY -= speed;
            player.direction = 'up';
            moved = true;
            break;
        case 'ArrowDown':
            newY += speed;
            player.direction = 'down';
            moved = true;
            break;
        case 'Space':
            // Ekstra bomba varsa veya yeterli süre geçtiyse bomba koy
            if (extraBombs > 0 || currentTime - lastBombTime >= BOMB_COOLDOWN) {
                const bombX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
                const bombY = Math.floor(player.y / CELL_SIZE) * CELL_SIZE;
                bombs.push({
                    x: bombX,
                    y: bombY,
                    timer: 120
                });
                if (extraBombs > 0) {
                    extraBombs--;
                } else {
                    lastBombTime = currentTime;
                }
            }
            break;
    }

    // Check boundaries
    if (newX >= 0 && newX <= canvas.width - player.size && 
        newY >= 0 && newY <= canvas.height - player.size) {
        // Check block collisions
        if (!checkCollision(newX, newY)) {
            player.x = newX;
            player.y = newY;
            if (moved) {
                lastMoveTime = currentTime; // Hareket edildiğinde zamanı güncelle
            }
        }
    }
});

// Handle mouse clicks for the Try Again button
canvas.addEventListener('click', (e) => {
    if (gameOver && !playerGhost) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Try Again butonunun konumu ve boyutu
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = canvas.width/2 - buttonWidth/2;
        const buttonY = canvas.height/2 + 20;
        
        // Tıklama butonun üzerinde mi kontrol et
        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
            // Restart game
            gameOver = false;
            player.x = CELL_SIZE;
            player.y = CELL_SIZE;
            bombs = [];
            explosions = [];
            powerUps = [];
            extraBombs = 0;
            score = 0;
            currentTime = 0;
            lastBombTime = 0;
            lastMoveTime = 0;
            playerGhost = null;
            gameOverTimer = 0;
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            initializeBlocks();
            initializeEnemies();
        }
    }
});

// Start game
initializeBlocks();
initializeEnemies(); // Oyun başlangıcında düşmanları oluştur
gameLoop(); 