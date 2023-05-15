const Flatland = {};


// We need a data structure that can:
// - Map each [i,j] to an identifier ID
// - For a given [i,j], look up all other [i,j] with the same ID
// We'll store an array of arrays `A[i][j]=ID` and a dict of lists D[ID]=[[i1,j1],[i2,j2],...].
//
Flatland.cornerStructure = {
    A: [],
    D: {},
    tiles: [],
    nextId: 1,
    fixed: [],

    memorizeNeighbors: function() {
        for (let i = 0; i < Object.keys(this.tiles).length; i++) {

            this.tiles[i].neighbors = []
            for (let j = 0; j < this.tiles[i].corners.length; j++) {
                for (let neighbor of this.getTilesAtCornerPoint(i, j)) {
                    if (!this.tiles[i].neighbors.includes(neighbor.i)) {
                        if (i !== neighbor.i) {
                            this.tiles[i].neighbors.push(neighbor.i);
                        }
                    }
                }
            }
        }
    },

    getTilesAtCornerPoint: function (i, j) {
        let id = this.A[i][j];
        return this.D[id];
    },

    getSmoothedCornerPoint: function (fixedTiles, i, j) {
        // Get the current position of fixedTiles[i].points[j], as the average
        // of all the points associated with that corner in our data structure.
        let id = this.A[i][j];
        console.assert(id >= 1);
        let pts = this.D[id];
        let x = 0;
        let y = 0;
        for (let p of pts) {
            x += fixedTiles[p.i].points[p.j].x;
            y += fixedTiles[p.i].points[p.j].y;
        }
        return { x: x / pts.length, y: y / pts.length };
    },

    memorizeCorners: function (fixedTiles) {
        this.tiles = fixedTiles
        let allpoints = [];
        for (let i = 0; i < fixedTiles.length; ++i) {
            let pts = Flatland.getPoints(fixedTiles[i]);
            let arr = [];
            for (let j = 0; j < pts.length; ++j) {
                allpoints.push({ i: i, j: j, x: pts[j].x, y: pts[j].y });
                arr.push(0);
            }
            if (i >= this.A.length) {
                this.A.push(arr);
            }
        }

        for (let p of allpoints) {
            // For each key, map it to a unique "group" identifier.
            if (this.A[p.i][p.j] !== 0) {
                // Cool, do nothing
            } else {
                // Search for any other points close to p.
                // They should all have the same group identifier.
                let foundId = 0;
                for (let p2 of allpoints) {
                    if (p !== p2 && p.i != p2.i && Flatland.getSquaredDistance(p, p2) < 0.01) {
                        let id2 = this.A[p2.i][p2.j];
                        if (id2 !== 0) {
                            console.assert(foundId == 0 || foundId == id2);
                            foundId = id2;
                        }
                    }
                }
                if (foundId === 0) {
                    foundId = this.nextId++;
                    this.D[foundId] = [];
                }
                this.A[p.i][p.j] = foundId;
                this.D[foundId].push({ i: p.i, j: p.j });
            }
        }
    },
};

Flatland.getSquaredDistance = function (p1, p2) {
    let dx = (p2.x - p1.x);
    let dy = (p2.y - p1.y);
    return dx*dx + dy*dy;
};

Flatland.getArea = function (ps) {
    let a = 0;
    for (let i = 0; i < ps.length; ++i) {
        let j = (i+1) % ps.length;
        a += ps[i].x * ps[j].y - ps[i].y * ps[j].x;
    }
    return a / 2;
};

Flatland.getCentroid = function (ps) {
    let a = 0;
    let c = {x: 0, y: 0};
    let n = ps.length;
    for (let i = 0; i < n; ++i) {
        let j = (i+1) % n;
        let k = ps[i].x * ps[j].y - ps[j].x * ps[i].y;
        a += k;
        c = {
            x: c.x + k*(ps[i].x + ps[j].x),
            y: c.y + k*(ps[i].y + ps[j].y),
        };
    }
    return {
        x: c.x / (3 * a),
        y: c.y / (3 * a),
    };
};

Flatland.View = function (canvas, unitCells, hyperparameters) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setUnitCells(unitCells);
    this.hyperparameters = hyperparameters;


};

Flatland.View.prototype.setUnitCells = function (unitCells) {
    this.scale = this.canvas.height / unitCells;
    this.scale = this.canvas.width / unitCells;
};

Flatland.View.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Flatland.View.prototype.drawFixedShape = function (fixedTiles, i, weight) {
    let n = fixedTiles[i].points.length;
    this.ctx.lineWidth = weight;
    this.ctx.strokeStyle = `black`
    let colors = ['#046635', '#068847', '#08aa59', '#09cc6b', '#0bee7c']
    if (fixedTiles[i].clicked) {
        this.ctx.fillStyle = colors[Math.floor(Math.random() * 5)];
    } else {
        this.ctx.fillStyle = `#efe6dc`;
    }
    let path = new Path2D();
    let start = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, 0);
    let end = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, (0 + 1) % n);
    let x1 = this.scale * start.x + (this.canvas.width / 2);
    let y1 = this.scale * start.y + (this.canvas.height / 2);
    let x2 = this.scale * end.x + (this.canvas.width / 2);
    let y2 = this.scale * end.y + (this.canvas.height / 2);
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
    let corners = [Flatland.cornerStructure.A[i][0]];
    for (let j = 1; j < n; ++j) {
        let start = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, j);
        let end = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, (j + 1) % n);
        let x1 = this.scale * start.x + (this.canvas.width / 2);
        let y1 = this.scale * start.y + (this.canvas.height / 2);
        let x2 = this.scale * end.x + (this.canvas.width / 2);
        let y2 = this.scale * end.y + (this.canvas.height / 2);
        corners.push(Flatland.cornerStructure.A[i][j])
        path.lineTo(x2, y2);
    }
    this.ctx.stroke(path);
    this.ctx.fill(path);

    Flatland.cornerStructure.tiles[i] = {
        ...Flatland.cornerStructure.tiles[i],
        path: path,
        index: i,
        corners: corners
    };
};

// Flatland.View.prototype.drawLine = function (start, end, width) {
//     let x1 = this.scale * start.x + (this.canvas.width / 2);
//     let y1 = this.scale * start.y + (this.canvas.height / 2);
//     let x2 = this.scale * end.x + (this.canvas.width / 2);
//     let y2 = this.scale * end.y + (this.canvas.height / 2);
//     this.ctx.lineTo(x2, y2);
// };

Flatland.rotate = function (p, theta) {
    let t = Math.atan2(p.y, p.x);
    let r = Math.hypot(p.y, p.x);
    return {
        x: r * Math.cos(t + theta),
        y: r * Math.sin(t + theta)
    };
};

Flatland.getPoints = function (shape) {
    // Return a shape with a constant area 8/3 of a triangle-with-unit-base, i.e. ~1.1547005383792515.
    let a = 100 * Math.cos(shape.k);
    let b = 100 * Math.sin(shape.k);
    let dist = function (p, q) {
        return Math.sqrt(Math.pow((p[0] - q[0]), 2) + Math.pow((p[1] - q[1]), 2));
    };
    const hr3 = 0.5 * Math.sqrt(3.0);
    const base_shape = [
        [0, 0],
        [0, -hr3],
        [0.5, -hr3],
        [0.75, -0.5 * hr3],
        [1.5, -hr3],
        [2.25, -0.5 * hr3],
        [2, 0],
        [2.25, 0.5 * hr3],
        [1.5, hr3],
        [1.5, 2 * hr3],
        [1, 2 * hr3],
        [0.5, hr3],
        [0.75, 0.5 * hr3],
    ];
    const sc1 = 2 * a;
    const sc2 = 2 * b * Math.sqrt(3) / 3;
    let ret = [
        {x: 0, y: 0}
    ];
    for (let j = 0; j < base_shape.length - 1; ++j) {
        let i = j + 1;
        let d = dist(base_shape[i - 1], base_shape[i]);
        // Side lengths alternate
        let sc = (Math.abs(d - hr3) < 1e-5) ? sc2 : sc1;
        let v = {
            x: base_shape[i][0] - base_shape[i - 1][0],
            y: base_shape[i][1] - base_shape[i - 1][1]
        };
        p = ret[ret.length - 1];
        ret.push({x: p.x + sc * v.x, y: p.y + sc * v.y});
    }
    let scalefactor = Math.sqrt(1.1547005383792515 / Flatland.getArea(ret));
    for (let j = 0; j < ret.length; ++j) {
        ret[j].x *= scalefactor;
        ret[j].y *= scalefactor;
    }
    for (let j = 0; j < ret.length; ++j) {
        if (!shape.flip) {
            ret[j].x = -ret[j].x;
            ret[j] = Flatland.rotate(ret[j], -shape.k / 2 + (shape.angle - 3) * Math.PI / 6);
        } else {
            ret[j] = Flatland.rotate(ret[j], -shape.k / 2 + (shape.angle + 5) * Math.PI / 6);
        }
    }
    let c = Flatland.getCentroid(ret);
    for (let j = 0; j < ret.length; ++j) {
        ret[j].x += shape.x - c.x;
        ret[j].y += shape.y - c.y;
    }
    return ret;
};

function initialHats() {
    let hats = {
        0: ".6.10...10..4.8...0.8..8f.2.6..4..6..4..0f.2.6.6.",
        1: "2.10..8...0.0.8.6f..6.10...10..4.8..4f.6.6...2.10..",
        2: ".2..0.0.10f..2.6..8..10..8..4f.6.6.6...2..4..2..0.",
        3: "..0f.2.10..4..10..4.8..4f.6.6...2.10..4...4.0..0f.2.",
        4: ".6...2..0.8..4f.6.6.6...2..4..2..0.8.2f..2.6...2",
        5: "10..4..0f.2.6.6...2.10..4...4.0..0f.2.6..4..10..4..",
        6: ".4f.6.6...2.10..4..10..0.8.2f..2.6...2..4.8...0.0.",
        7: "6...2..4..2..0.8..8f.2.6..4..10..4...4.0.0.10f..2.",
        8: "..4...4.0..0f.2.6.10...10..4.8...0.8.2f..2.10..4..10",
        9: ".0.8.2f..2.6...2.10..8...0.0.8.6f..6..4..2..0.8..",
        10: ".2.6..4..10..4..10..0.0.10f..2.6..8...4.0..0f.2.6.6",
        11: "..10..4.8...0.8..8f.2.10..4..10..4.8.2f..2.6...2.10.",
        12: "8...0.0.8.6f..6.10...2..0.8..4f.6.6..4..10..4..10..",
        13: ".0.10f..2.6..8..10..0..0f.2.6.6...2..4.8...0.8..8f.",
        14: ".10..4..10..4.8..8f.2.6...2.10..4...4.0.8.6f..6.10..",
        15: "...0.8..4f.6.6.10...10..4..10..0.8.2f..2.6..8..10..8",
        16: "8.6f..6.6...2.10..8...0.8..8f.2.6..4..10..4.8...0.",
        17: "6..8..10..4..10..0.8.6f..6.10...10..4.8...0.0.0.10f..",
        18: "..4.8...0.8..8f.2.6..8..10..8...0.0.0.10f..2.10..4.",
        19: ".4.0.8.6f..6.10...10..4.8...0.0.10f..2.10..4..10..0.8",
        20: "2f..2.6..8..10..8...0.0.0.10f..2..4..2..0.8..8f.2.6",
        21: ".4..10..4.8...0.0.10f..2.10..4...4.0..0f.2.6.10...10..",
        22: "4.8...0.0.0.10f..2..4..2..0.8.2f..2.6...2.10..8...0",
        23: ".0.0.10f..2.10..4...4.0..0f.2.6..4..10..4..2..0.0.10f",
        24: ".2.10..4..10..0.8.2f..2.6...2..4.8...0.0..0f.2.10..4",
        25: "..2..0.8..8f.2.6..4..10..4...4.0.0.10f..2.6...2..0.",
        26: "0..0f.2.6.10...10..4.8...0.8.2f..2.10..4..10..4..0f.2.",
        27: "2.6...2.10..8...0.0.8.6f..6..4..2..0.8..4f.6.6...2",
        28: ".10..4..10..0.0.10f..2.6..8...4.0..0f.2.6.6...2..4.",
        29: "...0.8..8f.2.10..4..10..4.8.2f..2.6...2.10..4...4.0.",
        30: "8.6f..6.10...2..0.8..4f.6.6..4..10..4..10..0.8.2f..2",
        31: "6..8..10..0..0f.2.6.6...2..4.8...0.8..8f.2.6..4..10",
        32: "..4.8..8f.2.6...2.10..4...4.0.8.6f..6.10...10..4.8..",
        33: "4f.6.6.10...10..4..10..0.8.2f..2.6..8..10..8...0.0.8.",
        34: "...2.10..8...0.8..8f.2.6..4..10..4.8...0.0.10f..2.6",
        35: ".4..10..0.8.6f..6.10...10..4.8...0.0.8.6f..10..4..10..",
        36: "0.8..8f.2.6..8..10..8...0.0.0.10f..2.6..8...0.8..4f",
        37: "2.6.10...10..4.8...0.0.10f..2.10..4..10..4.8.6f..6.6.",
        38: ".2.10..8...0.0.0.10f..2..4..2..0.8..4f.6.6..8..10..4",
        39: "..2..0.0.10f..2.10..4...4.0..0f.2.6.6...2..4.8...0",
        40: "0..0f.2.10..4..10..0.8.2f..2.6...2.10..4...4.0.8.6f.",
        41: "2.6...2..0.8..8f.2.6..4..10..4..10..0.8.2f..2.6..8.",
        42: ".10..4..0f.2.6.10...10..4.8...0.8..8f.2.6..4..10..4.",
        43: "..4f.6.6...2.10..8...0.0.8.6f..6.10...10..4.8..4f.6.6",
        44: ".6...2..4..2..0.0.10f..2.6..8..10..8..4f.6.6.6...2",
        45: "10..4...4.0..0f.2.10..4..10..4.8..4f.6.6...2.10..4..10",
        46: "..0.8.2f..2.6...2..0.8..4f.6.6.6...2..4..2..0.8..",
        47: "8f.2.6..4..10..4..0f.2.6.6...2.10..4...4.0..0f.2.6.",
    };
    let adjust = function (tile) {
        let ps = Flatland.getPoints(tile);
        let c = Flatland.getCentroid([ps[0], ps[4], ps[8]]);
        tile.x = -c.x;
        tile.y = -c.y;
        return tile;
    };

    let tiles = [];
    for (let col in hats) {
        let s = hats[col];
        let hx = parseInt(col);
        let hy = 0;
        for (let i = 0; i < s.length; ++i) {
            if (s[i] == '.') {
                // do nothing
            } else {
                let angle = parseInt(s.substr(i));
                while (i < s.length && s[i] != '.') ++i;
                let flip = (s[i - 1] == 'f');
                let tile = adjust({x: 0, y: 0, angle: angle, flip: flip, k: Math.PI / 3});
                tile.x += (hx * Math.sqrt(3) / 2 - ((hy + hx + 1) % 2) * 0.25);
                tile.y -= hy * 0.5;
                tile.x -= 21.042;
                tile.y += 15;
                tiles.push(tile);
                ++hy;
            }
            hy += 1;
        }
    }
    return tiles;
}

function run(continuous) {

    let escherCanvas = window.document.getElementById("escherView");
    let hyperparameters = {
        cellsToOverpopulate: document.querySelector("#cellsToOverpopulate").value,
        cellsToPopulate: document.querySelector("#cellsToPopulate").value,
        cellsToSolitude: document.querySelector("#cellsToSolitude").value
    }
    let escherView = new Flatland.View(escherCanvas, 22, hyperparameters);
    let fixedTiles = initialHats();
    Flatland.cornerStructure.fixed = fixedTiles;
    let showFlips = false;
    let showNumCells = 22;

    Flatland.cornerStructure.memorizeCorners(fixedTiles);

    let timeStep = function (game) {
        console.log(escherView.hyperparameters)
        // clear the canvases before doing anything
        escherView.clear();
        escherView.setUnitCells(showNumCells);

        for (let i = 0; i < fixedTiles.length; ++i) {
            // Compute the points just once, because drawFixed Shape will use them a lot.
            fixedTiles[i].points = Flatland.getPoints(fixedTiles[i]);
        }

        if (Object.keys(Flatland.cornerStructure.tiles).length != 0 && game) {
            let fixedTilesCopy = JSON.parse(JSON.stringify(fixedTiles))
            for (let i = 0; i < fixedTiles.length; i++) {
                let liveNeighbors = 0;
                let iNeighbour = Flatland.cornerStructure.tiles[i].neighbors
                for (let j = 0; j < iNeighbour.length; j++) {
                    if (fixedTilesCopy[iNeighbour[j]].clicked) {
                        liveNeighbors++
                    }
                }
                if (fixedTilesCopy[i].clicked) {
                    //fixedTiles[i].clicked = false;
                    if (liveNeighbors <= escherView.hyperparameters.cellsToSolitude || liveNeighbors >= escherView.hyperparameters.cellsToOverpopulate) {
                        fixedTiles[i].clicked = false;
                    }
                } else {
                    if (liveNeighbors == escherView.hyperparameters.cellsToPopulate) {
                        fixedTiles[i].clicked = true;
                    }
                }
            }
        }
        for (let i = 0; i < fixedTiles.length; ++i) {
            let weight = (showFlips && fixedTiles[i].flip) ? 3 : 1;
            escherView.drawFixedShape(fixedTiles, i, weight);
        }

        for (let i = 0; i < fixedTiles.length; ++i) {
            if (showFlips && fixedTiles[i].flip){
                escherView.drawFixedShape(fixedTiles, i, 3);
            }
        }
    };

    escherCanvas.addEventListener('mousedown', function (e) {
        let clickPath = new Path2D();
        for (let shape of Object.keys(Flatland.cornerStructure.tiles)) {
            if (this.getContext('2d').isPointInPath(Flatland.cornerStructure.tiles[shape].path, (e.x - escherView.canvas.getBoundingClientRect().left), (e.y - escherView.canvas.getBoundingClientRect().top))) {
                let currentTileIndex = Flatland.cornerStructure.tiles[shape].index;
                fixedTiles[currentTileIndex].clicked = !fixedTiles[currentTileIndex].clicked;
                let currentTileIds = [];
                for (let j = 0; j < fixedTiles[currentTileIndex].points.length; j++) {
                    let cornerId = Flatland.cornerStructure.A[currentTileIndex][j];
                    currentTileIds.push(cornerId);
                }

            }
        }

        timeStep();
    })

    window.document.onkeydown = function (e) {
        if (e.key == '+') {
            showNumCells = Math.max(showNumCells - 1, 5);
            timeStep();
        } else if (e.key == '-') {
            showNumCells = Math.min(showNumCells + 1, 50);
            timeStep();
        } else if (e.key == 'f') {
            showFlips = !showFlips;
        } else if (e.key == 't') {
            timeStep(true);
        }
    };
    Flatland.timeStep = timeStep;
    timeStep();
    Flatland.cornerStructure.memorizeNeighbors(fixedTiles);
};

let runInterval;
function start() {
    if (!runInterval) {
        runInterval = window.setInterval(function(){
            Flatland.timeStep(true);
        }, 500);
        console.log(document.querySelector("#start span"))
        document.querySelector("#startText").style.display = "none";
        document.querySelector("#stopText").style.display = "inline-block";

    } else {
        window.clearInterval(runInterval);
        document.querySelector("#startText").style.display = "inline-block";
        document.querySelector("#stopText").style.display = "none";
        runInterval = null;
    }
}
window.onload = function () {
    run();
}