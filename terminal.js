function Tileset(options) {
  options = options || {}
  this.width = options.width || 128;
  this.height = options.height || 256;
  this.tileWidth = options.tileWidth || 8;
  this.tileHeight = options.tileHeight || 16;
  this.name = options.name || "tileset.png";

  this.setup = function (loader, resources) {
    var baseTexture = resources[this.name].texture.baseTexture;
    baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    this.tiles = {}
    var x = 0, y = 0;
    var numTiles =
	(this.width / this.tileWidth) *	(this.height / this.tileHeight);
    for (var i = 0; i < numTiles; i++) {
      var frame = new PIXI.Rectangle(x, y, this.tileWidth, this.tileHeight);
      this.tiles[i] = new PIXI.Texture(baseTexture, frame);
      x += this.tileWidth;
      if (x >= this.width) {
	x = 0;
	y += this.tileHeight;
      }
    }

    if (typeof this.loaded === "function") {
      this.loaded();
    }
  }
  
  PIXI.loader.add(this.name, this.name).load(this.setup.bind(this));
}

function Terminal(options) {
  const FG_COLOR_DEFAULT = 0xffffff;
  const BG_COLOR_DEFAULT = 0x000000;
  
  options = options || {}
  this.scrWidth = options.scrWidth || 640;
  this.scrHeight = options.scrHeight || 480;
  this.width = options.width || 80;
  this.height = options.height || 30;
  this.tileset = options.tileset || new Tileset();

  this.renderer =
    new PIXI.autoDetectRenderer(this.scrWidth, this.scrHeight,
				{antialiasing: false,
				 resolution: window.devicePixelRatio});
  this.view = this.renderer.view;
  this.view.className = "terminal";

  this.stage = new PIXI.Container();

  var setup = function () {
    // background layer (for text background colors)
    this.background = new PIXI.Graphics();
    this.background.beginFill(BG_COLOR_DEFAULT);
    this.background.drawRect(0, 0, this.scrWidth, this.scrHeight);
    this.stage.addChild(this.background);

    // text layer
    this.sprites = [];
    this.chars = [];
    this.spriteWidth = this.scrWidth / this.width;
    this.spriteHeight = this.scrHeight / this.height;
    for (var x = 0; x < this.width; x++) {
      var spriteCol = [];
      var charCol = [];
      for (var y = 0; y < this.height; y++) {
	var sprite = new PIXI.Sprite(this.tileset.tiles[0]);
	sprite.position.x = x * this.spriteWidth;
	sprite.position.y = y * this.spriteHeight;
	sprite.width = this.spriteWidth;
	sprite.height = this.spriteHeight;
	spriteCol.push(sprite);
	charCol.push({value: 0, fg: FG_COLOR_DEFAULT, bg: BG_COLOR_DEFAULT});
	this.stage.addChild(sprite);
      }
      this.sprites.push(spriteCol);
      this.chars.push(charCol);
    }

    // foreground graphics layer
    this.foreground = new PIXI.Graphics();
    this.stage.addChild(this.foreground);

    this.animate();
    
    if (typeof this.ready === "function") {
      this.ready();
    }
  }
  this.tileset.loaded = setup.bind(this);

  this.animate = function () {
    requestAnimationFrame(this.animate.bind(this));
    
    if (typeof this.update === "function") {
      this.update();
    }
    
    this.renderer.render(this.stage);
  }
  
  //
  // --- text methods ----
  //
  this.putChar = function(x, y, c, fg, bg) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      if (typeof fg === "undefined") { fg = FG_COLOR_DEFAULT };
      if (typeof bg === "undefined") { bg = BG_COLOR_DEFAULT };
      var value = (typeof c == "string") ? c.charCodeAt(0) : c;
      this.chars[x][y] = {value: value, fg: fg, bg: bg};
      this.sprites[x][y].texture = this.tileset.tiles[value];
      this.sprites[x][y].tint = fg;
      // bg
      this.background.beginFill(bg);
      this.background.drawRect(this.sprites[x][y].position.x,
			       this.sprites[x][y].position.y,
			       this.spriteWidth, this.spriteHeight);
      this.background.endFill();
    }
  }

  this.getChar = function(x, y) {
    return this.chars[x][y].value;
  }
  this.getCharFG = function(x, y) {
    return this.chars[x][y].fg;
  }
  this.getCharBG = function(x, y) {
    return this.chars[x][y].bg;
  }
  this.getCharAttribs = function(x, y) {
    return this.chars[x][y]
  }

  this.putString = function(x, y, str, fg, bg) {
    var curX = x, curY = y;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (c == "\n") {
	curX = x;
	curY++;
      } else {
        this.putChar(curX++, curY, c, fg, bg)
      }
    }
  }

  this.clearText = function(bg) {
    for (var x = 0; x < this.width; x++) {
      for (var y = 0; y < this.height; y++) {
	this.putChar(x, y, 0, null, bg);
      }
    }
  }
  
  this.clearDraw = function() {
    this.foreground.clear();
  }

  this.clear = function(bg) {
    this.clearText(bg);
    this.clearDraw();
  }
  
  //
  // --- drawing methods ----
  //
  this.drawPixel = function(x, y, col) {
    if (typeof col === "undefined") { col = FG_COLOR_DEFAULT };
    this.foreground.beginFill(col);
    this.foreground.drawRect(x, y, 1, 1);
    this.foreground.endFill();
  }

  this.drawHorizLine = function(x0, x1, y, col) {
    for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      this.drawPixel(x, y, col);
    }
  }

  this.drawVertLine = function(x, y0, y1, col) {
    for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      this.drawPixel(x, y, col);
    }
  }

  // Bresenham's algorithm
  this.drawLine = function(x0, y0, x1, y1, col) {
    if (x0 > x1) {
      var tmp = x1; x1 = x0; x0 = tmp;
      tmp = y1; y1 = y0; y0 = tmp;
    }
    if (Math.abs(x0 - x1) < 1) {  // vertical line
      this.drawVertLine(x0, y0, y1, col);
    } else {
      var deltax = x1 - x0;
      var deltay = y1 - y0;
      var error = 0;
      var deltaerr = Math.abs(deltay / deltax);
      var y = y0;
      for (var x = x0; x <= x1; x++) {
	this.drawPixel(x, y, col);
	error += deltaerr;
	while (error >= 0.5) {
	  this.drawPixel(x, y);
	  y += Math.sign(y1 - y0, col);
	  error -= 1.0;
	}
      }
    }
  }

  this.drawRect = function(x0, y0, x1, y1, col) {
    this.drawHorizLine(x0, x1, y0, col);
    this.drawHorizLine(x0, x1, y1, col);
    this.drawVertLine(x0, Math.min(y0, y1) + 1, Math.max(y0, y1) - 1, col);
    this.drawVertLine(x1, Math.min(y0, y1) + 1, Math.max(y0, y1) - 1, col);
  }

  this.fillRect = function(x0, y0, x1, y1, col) {
    for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      this.drawHorizLine(x0, x1, y, col);
    }
  }

  // algorithm: https://web.archive.org/web/20120225095359/ ...
  // http://homepage.smc.edu/kennedy_john/belipse.pdf
  this._plot4 = function (cx, cy, x, y, col) {
    this.drawPixel(cx + x, cy + y, col);
    this.drawPixel(cx - x, cy + y, col);
    this.drawPixel(cx - x, cy - y, col);
    this.drawPixel(cx + x, cy - y, col);
  }

  this.drawEllipse = function(cx, cy, xradius, yradius, col) {
    var twoASquare = 2 * xradius * xradius;
    var twoBSquare = 2 * yradius * yradius;
    // 1st set
    var x = xradius, y = 0;
    var xchange = yradius * yradius * (1 - 2 * xradius);
    var ychange = xradius * xradius;
    var ellipseError = 0;
    var stoppingX = twoBSquare * xradius;
    var stoppingY = 0;
    while (stoppingX >= stoppingY) {
      this._plot4(cx, cy, x, y, col);
      y++;
      stoppingY += twoASquare;
      ellipseError += ychange;
      ychange += twoASquare;
      if ((2 * ellipseError + xchange) > 0) {
	x--;
	stoppingX -= twoBSquare;
	ellipseError += xchange;
	xchange += twoBSquare;
      }
    }
    // 2nd set
    x = 0;
    y = yradius;
    xchange = yradius * yradius;
    ychange = xradius * xradius * (1 - 2 * yradius);
    ellipseError = 0;
    stoppingX = 0;
    stoppingY = twoASquare * yradius;
    while (stoppingX <= stoppingY) {
      this._plot4(cx, cy, x, y, col);
      x++;
      stoppingX += twoBSquare;
      ellipseError += xchange;
      xchange += twoBSquare;
      if ((2 * ellipseError + ychange) > 0) {
	y--;
	stoppingY -= twoASquare;
	ellipseError += ychange;
	ychange += twoASquare;
      }
    }
  }

  this.fillEllipse = function(cx, cy, xradius, yradius, col) {
    for (var x = cx - xradius; x <= cx + xradius; x++) {
      for (var y = cy - yradius; y <= cy + yradius; y++) {
	if ((x-cx)*(x-cx)/(xradius*xradius)+
	    (y-cy)*(y-cy)/(yradius*yradius) <= 1) {
    	  this.drawPixel(x, y);
	}
      }
    }
  }
}
