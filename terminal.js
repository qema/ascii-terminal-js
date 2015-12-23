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

  this.stage = new PIXI.Container();

  var setup = function () {
    this.background = new PIXI.Graphics();
    this.background.beginFill(BG_COLOR_DEFAULT);
    this.background.drawRect(0, 0, this.scrWidth, this.scrHeight);
    this.stage.addChild(this.background);
    
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

  this.putChar = function(x, y, c, fg, bg) {
    fg = fg || FG_COLOR_DEFAULT;
    bg = bg || BG_COLOR_DEFAULT;
    var value = (typeof c == "string") ? c.charCodeAt(0) : c;
    this.chars[x][y] = {value: value, fg: fg, bg: bg};
    this.sprites[x][y].texture = this.tileset.tiles[value];
    this.sprites[x][y].tint = fg;
    // bg
    this.background.beginFill(bg);
    this.background.lineStyle(0);
    this.background.drawRect(this.sprites[x][y].position.x,
			     this.sprites[x][y].position.y,
			     this.spriteWidth, this.spriteHeight);
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

  this.clear = function(bg) {
    for (var x = 0; x < this.width; x++) {
      for (var y = 0; y < this.height; y++) {
	terminal.putChar(x, y, 0, null, bg);
      }
    }
  }
}
