let camX = 0;
let camY = 0;

let dragStartX = 0;
let dragStartY = 0;
let dragStartScreenX = 0;
let dragStartScreenY = 0;
let touchTime = 0;

/** @type {Map<Number, Map<Number, Chunk>>} */
let chunks = new Map();
let density = 0.20;
let revealCount = 0;
let flagCount = 0;
let mistakeCount = 0;

let canvas;
let isDrag = false;

let cellSize = 40;

let cellColors;

let debugText = "asdf";

function setup() {
  canvas = createCanvas(windowWidth,windowHeight);

  // Disable right-click context menu
  canvas.canvas.addEventListener("contextmenu", e => e.preventDefault())

  for (let x = -5; x <= 4; x++) {
    for (let y = -3; y <= 2; y++) {
      setCell(x,y,EMPTY)
    }
  }

  revealSquare(0,0)

  camX = -width/2;
  camY = -height/2;

  cellColors = [
    color(255, 255, 255),
    color(181, 190, 255),
    color(184, 255, 254),
    color(181, 255, 191),
    color(218, 255, 181),
    color(255, 255, 181),
    color(255, 214, 181),
    color(255, 186, 181),
    color(255, 181, 232)
  ]
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  processKeys();

  clear(128,128,128);

  fill(128);
  noStroke();
  rect(0,0,width,height);

  push()
  translate(-camX, -camY);
  for (let r = Math.floor(camY / (cellSize*16)); r < Math.ceil((camY + height) / (cellSize*16)); r++) {
    for (let c = Math.floor(camX / (cellSize*16)); c < Math.ceil((camX + width) / (cellSize*16)); c++) {
      let row = chunks.get(r);
      if (!row) continue;

      let chunk = row.get(c);
      if (!chunk) continue;

      chunk.draw();
    }
  }

  // Tutorial text
  if (camX+width > cellSize*-5 && camX < cellSize*6 && camY+width > cellSize*-3 && camY < cellSize*4) {
    stroke(0);
    fill(255);
    rect(cellSize*-4, cellSize*-2, cellSize*8, cellSize*4);

    noStroke();
    fill(0);
    textAlign(CENTER, CENTER)
    textSize(cellSize * 0.7);
    text(
      "Left click to reveal\n"+
      "Right click to flag\n"+
      "Left drag to quick solve\n"+
      "Right drag to pan",
      0,
      0
    );
  }

  pop()

  stroke(0);
  strokeWeight(2);
  fill(255);

  let lines = [
    `${revealCount} revealed`,
    `${flagCount} flagged`,
    // `${mistakeCount} mistakes`
  ];
  let maxWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    maxWidth = Math.max(maxWidth, textWidth(lines[i]));
  }

  rect(5, 5, maxWidth + 10, lines.length*30);

  noStroke();
  fill(0);
  textSize(20);
  textAlign(CENTER, TOP);

  let textY = 10;

  for (let i = 0; i < lines.length; i++) {
    text(lines[i], maxWidth/2 + 10, textY);
    textY += 30;
  }


  // if (debugText) {
  //   textAlign(RIGHT, TOP);
  //   text(debugText, 5, 5);
  // }
}

function touchStarted(event) {
  dragStartScreenX = mouseX;
  dragStartScreenY = mouseY;
  dragStartX = mouseX + camX;
  dragStartY = mouseY + camY;
  touchTime = Date.now();

  isDrag = false;
  event.preventDefault();

  debugText = mouseButton
}

function touchEnded() {
  // Don't handle drags
  if (isDrag) return;

  let x = Math.floor((mouseX + camX)/cellSize);
  let y = Math.floor((mouseY + camY)/cellSize);

  if (mouseButton === LEFT) {
    if (isNumbered(getCell(x,y))) {
      chordSquare(x,y,2);
    } else {
      revealSquare(x,y);
    }
  } else if (mouseButton === RIGHT) {
    if (isNumbered(getCell(x,y))) {
      chordSquare(x,y,1);
    } else {
      flagSquare(x,y);
    }
  } else if (mouseButton === 0) {
    if (isNumbered(getCell(x,y))) {
      chordSquare(x,y,2);
    } else {
      if (Date.now() - touchTime > 200) {
        revealSquare(x,y);
      } else {
        flagSquare(x,y);
      }
    }
  }
}

function touchMoved() {
  if (!isDrag) {
    if (Math.abs(dragStartScreenX - mouseX) + Math.abs(dragStartScreenY - mouseY) > 3) {
      isDrag = true;
    } else {
      return;
    }
  }

  let x = Math.floor((mouseX + camX)/cellSize);
  let y = Math.floor((mouseY + camY)/cellSize);

  if (mouseButton === LEFT) {
    if (isNumbered(getCell(x,y))) {
      chordSquare(x,y,2);
    } else {
      //revealSquare(x,y);
    }
  } else if (mouseButton === CENTER || mouseButton === RIGHT || mouseButton === 0) {
    camX = dragStartX - mouseX;
    camY = dragStartY - mouseY;
  }
}

function getChunkWith(x,y) {
  const r = Math.floor(y/16);
  const c = Math.floor(x/16);

  let row = chunks.get(r);
  if (!row) {
    row = new Map();
    chunks.set(r, row);
  }

  let chunk = row.get(c);
  if (!chunk) {
    chunk = new Chunk(c*16, r*16);
    row.set(c, chunk);
  }

  return chunk;
}

function processKeys() {
  let speed = 10;

  if (keyIsDown(65) || keyIsDown(LEFT_ARROW))  camX -= speed; // A
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) camX += speed; // D
  if (keyIsDown(87) || keyIsDown(UP_ARROW))    camY -= speed; // W
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW))  camY += speed; // S
}

function getCell(x,y) {
  let chunk = getChunkWith(x,y);
  return chunk.cells[y - chunk.y0][x - chunk.x0];
}

function setCell(x,y,value) {
  let chunk = getChunkWith(x,y);
  return chunk.cells[y - chunk.y0][x - chunk.x0] = value;
}

function flagSquare(x,y) {
  let cell = getCell(x,y);
  let newCell = cell;

  switch (cell) {
    case EMPTY:         newCell = MARKED_EMPTY; flagCount++; break;
    case MINE:          newCell = MARKED_MINE;  flagCount++; break;
    case MARKED_EMPTY:  newCell = EMPTY;        flagCount--; break;
    case MARKED_MINE:   newCell = MINE;         flagCount--; break;
  }

  setCell(x, y, newCell);
}

function revealSquare(x,y) {
  let maxReveal = 1000;

  let queue = [];

  function doReveal(x,y) {
    let cell = getCell(x,y)
    if (!canReveal(cell)) return;

    if (isMine(cell)) {
      setCell(x ,y, REVEALED_MINE);
      mistakeCount++;
      flagCount++;
    } else {
      let count = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (isMine(getCell(x + dx, y + dy))) {
            count++;
          }
        }
      }

      maxReveal --;
      revealCount ++;
      setCell(x, y, count);

      if (count === 0) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            queue.push(x + dx, y + dy);
          }
        }
      }
    }
  }

  queue.push(x);
  queue.push(y);

  while (queue.length > 0 && maxReveal > 0) {
    x = queue.shift();
    y = queue.shift();
    doReveal(x,y);
  }
}

/**
 * Chord a nearly-complete cell, flagging or revealing remaining squares
 * @param {Number} x X of cell to chord
 * @param {Number} y Y of cell to chord
 * @param {Number} type 0 = reveal only, 1 = flag only, 2 = flag and reveal
 */
function chordSquare(x,y,type) {
  let centerCell = getCell(x,y);

  if (!isNumbered(centerCell)) return;

  let marked = 0;
  let canMark = 0;

  // Count surrounding markable & marked cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      // Ignore center cell
      if (dx === 0 && dy === 0) continue;
      let cell = getCell(x + dx, y + dy);

      if (isHidden(cell) || cell === REVEALED_MINE) {
        canMark++;
        if (isFlagged(cell)) {
          marked++;
        }
      }
    }
  }

  if (marked === centerCell && type !== 1) {
    // Reveal surrounding squares
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        revealSquare(x + dx, y + dy);
      }
    }
  } else if (canMark === centerCell && type !== 0) {
    // Mark surrounding (unmarked) squares
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!isFlagged(getCell(x + dx, y + dy))) {
          flagSquare(x + dx, y + dy);
        }
      }
    }
  }
}

function isMine(cell) {
  return cell === MINE || cell === MARKED_MINE || cell === REVEALED_MINE;
}

function isHidden(cell) {
  return cell === MINE || cell === MARKED_MINE || cell === EMPTY || cell === MARKED_EMPTY;
}

function isNumbered(cell) {
  return cell >= 0;
}

function canReveal(cell) {
  return cell === MINE || cell === EMPTY;
}

function isFlagged(cell) {
  return cell === MARKED_EMPTY || cell === MARKED_MINE || cell === REVEALED_MINE;
}

class Chunk {
  constructor(x0, y0) {
    this.x0 = x0;
    this.y0 = y0;

    this.cells = Array(16).fill().map(e => Array(16).fill().map(e => 
      (Math.random() < density) ? MINE : EMPTY
    ))
  }

  draw() {
    const size = cellSize;

    push();
    stroke(0);
    textAlign(CENTER, CENTER);
    textSize(size/2);

    for (let y=0; y<this.cells.length; y++) {
      for (let x=0; x<this.cells[y].length; x++) {
        let dx = (this.x0 + x)*size;
        let dy = (this.y0 + y)*size;

        let c = this.cells[y][x];
        
        if (c === WALL) {
          // Black
          strokeWeight(0);
          fill(0,0,0);
          rect(dx, dy, size, size);
        } else if (c === BLANK) {
          // Do nothing
        } else if (c === MARKED_EMPTY || c === MARKED_MINE || c === REVEALED_MINE) {
          // Flag/mine - Dark red
          strokeWeight(2);
          fill(100,0,0);
          rect(dx, dy, size, size);
          if (c == REVEALED_MINE) {
            push();
            noStroke();
            fill(255);
            text("X", dx + size/2, dy + size/2);
            pop();
          }
        } else if (c < REVEALED_MINE) {
          // Hidden cell - gray
          strokeWeight(2);
          fill(128);
          rect(dx, dy, size, size);
        } else {
          // Numbered cell - pastel color
          strokeWeight(0.5);
          fill(cellColors[c]);
          rect(dx, dy, size, size);
          if (c > 0) {
            push();
            noStroke();
            fill(0);
            text(c, dx + size/2, dy + size/2);
            pop();
          }
        }
      }
    }

    pop();
  }
}

const REVEALED_MINE = -1;
const EMPTY = -2;
const MINE = -3;
const MARKED_EMPTY = -4;
const MARKED_MINE = -5;
const WALL = -6;
const BLANK = -7;