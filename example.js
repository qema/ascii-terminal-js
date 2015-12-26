function startREPL() {
  var width = 80, height = 30;
  
  var terminal = new Terminal({width: width, height: height});
  document.body.appendChild(terminal.view);

  var charCount = 0;
  var curX = 0, curY = 0;
  var frames = 0;
  var started = false;

  function scroll() {
    curY--;
    for (var y = 1; y < height; y++) {
      for (var x = 0; x < width; x++) {
	var c = terminal.getChar(x, y);
	var fg = terminal.getCharFG(x, y);
	var bg = terminal.getCharBG(x, y);
	terminal.putChar(x, y - 1, c, fg, bg);
      }
    }
    for (var x = 0; x < width; x++) {
      terminal.putChar(x, height - 1, 0);
    }
  }

  document.addEventListener("keypress", function(event) {
    if (started) {
      var c = event.charCode;
      if (c == 13) {  // enter
	terminal.putChar(curX, curY, 0);
	curX = 0;
	curY++;
	if (curY == height) { // reached end, so scroll
	  scroll();
	}
	charCount++;
      } else if (c == 8) {  // backspace
	if (charCount > 0 && !(curX == 0 && curY == 0)) {
	  terminal.putChar(curX, curY, 0);
	  curX--;
	  if (curX < 0) {
	    curX = width - 1;
	    curY--;
	    while (terminal.getChar(curX, curY) == 0 && curX > 0) {
	      curX--;
	    }
	    if (terminal.getChar(curX, curY) > 0 && curX < width - 1) curX++;
	  }
	  terminal.putChar(curX, curY, 0);
	  charCount--;
	}
      } else {
	terminal.putChar(curX, curY, c);
	curX++;
	if (curX == width) {
	  curX = 0;
	  curY++;
	  if (curY == height) {
	    scroll();
	  }
	}
	charCount++;
      }
      frames = 0;
    }
  });

  terminal.ready = function() {
    terminal.putString(0, 0, "Type anything.", 0xff0000, 0x0000ff);
    terminal.putString(0, 1, "--------------");
    curY = 2;
    started = true;

    terminal.drawRect(20, 20, 200, 100, 0x0000ff);
    terminal.fillRect(21, 21, 199, 99, 0x00ff00);
    terminal.drawPixel(50, 50, 0x000000);

    terminal.fillEllipse(100, 100, 50, 100);

    var lastX = 0, lastY = 0;
    terminal.update = function() {
      if (started) {
	if (frames % 60 == 0) {
	  terminal.putChar(curX, curY, "_"); lastX = curX; lastY = curY;
	} else if (frames % 60 == 30) {
	  terminal.putChar(lastX, lastY, " ");
	}
	frames++;
      }
    }
  }
}
