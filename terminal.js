function cssColor(c) {
  return "#" + ("000000" + c.toString(16)).substr(-6)
}

function Tileset(options) {
  options = options || {}
  this.width = options.width || 128;
  this.height = options.height || 256;
  this.tileWidth = options.tileWidth || 8;
  this.tileHeight = options.tileHeight || 16;
  this.name = options.name || "tileset.png";
  
  this.getTileRect = function(i) {
    return { x: (i % (this.width / this.tileWidth)) * this.tileWidth,
	     y: Math.floor(i / (this.width / this.tileWidth)) *
	        this.tileHeight,
	     width: this.tileWidth,
	     height: this.tileHeight}
  }

  var cache = {};
  var buffer = document.createElement("canvas");
  buffer.width = this.tileWidth;
  buffer.height = this.tileHeight;
  this.drawTile = function(ctx, id, col, x, y, w, h) {
    if (typeof col === "undefined") { col = 0xffffff; }

    var rect = this.getTileRect(id);
    ctx.drawImage(this.img, rect.x, rect.y, rect.width, rect.height,
		  x, y, w, h);
    
    var img;
    if ([id, col] in cache) {
      img = cache[[id, col]];
    } else {
      var bx = buffer.getContext("2d");

      bx.fillStyle = cssColor(col);
      bx.fillRect(0, 0, buffer.width, buffer.height);
      bx.globalCompositeOperation = "destination-atop";

      bx.drawImage(this.img, rect.x, rect.y, rect.width, rect.height,
		   0, 0, w, h);
      var cached = new Image();
      cached.onload = function() {
        cache[[id, col]] = cached;
      }
      cached.src = buffer.toDataURL("image/png");
      img = buffer;
    }
    ctx.drawImage(img, 0, 0, this.tileWidth, this.tileHeight, x, y, w, h);
  }
  
  this.img = new Image();
  this.img.onload = function() {
    if (typeof this.loaded === "function") {
      this.loaded();
    }
  }.bind(this);
  this.img.src = this.name;
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

  var spriteWidth = this.scrWidth / this.width;
  var spriteHeight = this.scrHeight / this.height;

  var canvas = document.createElement("canvas");
  this.resolution = window.devicePixelRatio;
  canvas.className = "terminal";
  canvas.width = this.scrWidth * this.resolution;
  canvas.height = this.scrHeight * this.resolution;
  canvas.style.width = this.scrWidth.toString() + "px";
  canvas.style.height = this.scrHeight.toString() + "px";
  canvas.style.border = "1px solid";
  this.ctx = canvas.getContext("2d");
  this.ctx.mozImageSmoothingEnabled = false;
  this.ctx.webkitImageSmoothingEnabled = false;
  this.ctx.imageSmoothingEnabled = false;
  this.ctx.scale(this.resolution, this.resolution);
  this.view = canvas;

  // setup
  this.tileset.loaded = function() {
    // char memory
    this.chars = [];
    for (var x = 0; x < this.width; x++) {
      var col = [];
      for (var y = 0; y < this.height; y++) {
	col.push({value: 0, fg: FG_COLOR_DEFAULT, bg: BG_COLOR_DEFAULT});
      }
      this.chars.push(col);
    }
    // background
    this.ctx.fillStyle = cssColor(BG_COLOR_DEFAULT);
    this.ctx.fillRect(0, 0, this.scrWidth, this.scrHeight);

    // animate loop
    this.animate = function () {
      requestAnimationFrame(this.animate.bind(this));

      if (typeof this.update === "function") {
	this.update();
      }
    }
    this.animate();

    // callback
    if (typeof this.ready === "function") {
      this.ready();
    }
  }.bind(this);
  
  //
  // --- text methods ----
  //
  this.putChar = function(x, y, c, fg, bg) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      if (typeof fg === "undefined") { fg = FG_COLOR_DEFAULT };
      if (typeof bg === "undefined") { bg = BG_COLOR_DEFAULT };
      var value = (typeof c === "string") ? c.charCodeAt(0) : c;
      var src = this.tileset.getTileRect(value);
      this.chars[x][y].value = value;
      this.chars[x][y].fg = fg;
      this.chars[x][y].bg = bg;
      this.ctx.fillStyle = cssColor(bg);
      this.ctx.fillRect(x * spriteWidth, y * spriteHeight,
			spriteWidth, spriteHeight);
      this.tileset.drawTile(this.ctx, value, fg,
			    x * spriteWidth, y * spriteHeight,
			    spriteWidth, spriteHeight);
    }
  }

  this.getCharAttribs = function(x, y) {
    return this.chars[x][y];
  }
  this.getChar = function(x, y) {
    return this.getCharAttribs(x, y).value;
  }
  this.getCharFG = function(x, y) {
    return this.getCharAttribs(x, y).fg;
  }
  this.getCharBG = function(x, y) {
    return this.getCharAttribs(x, y).bg;
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

  this.clearText = function(fg, bg) {
    for (var x = 0; x < this.width; x++) {
      for (var y = 0; y < this.height; y++) {
	this.putChar(x, y, 0, fg, bg);
      }
    }
  }
  
  this.clearDraw = function() {
  }

  this.clear = function(fg, bg) {
    this.clearText(fg, bg);
    this.clearDraw();
  }
  
  //
  // --- drawing methods ----
  //
  this.drawPixel = function(x, y, col) {
    if (typeof col === "undefined") { col = FG_COLOR_DEFAULT };
    this.ctx.fillStyle = cssColor(col);
    this.ctx.fillRect(x, y, 1, 1);
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
