var canvas, ctx, zoom = 1, scale = 10, lineWidth = 2, stageName, resetScaleButton, scaleSlider, scaleIndicator, darkModeToggle;
var posOffset = [0, 0];
var isDarkmode = false;

addEventListener("resize", canvasSize);
addEventListener("wheel", (event) => { });
addEventListener("click", draw);

onwheel = (event) => {
    if (event.deltaY > 0) { // scroll down
        scale += .5;
    } else {                // scroll up
        scale -= .5;
    }
    if (scale < 0)
        scale = 0;

    scaleIndicator.textContent = Math.round((scale + Number.EPSILON) * 100) / 100;
    draw();
}



document.addEventListener("DOMContentLoaded", function () {
    canvas = document.getElementsByTagName("canvas")[0];
    ctx = canvas.getContext("2d");
    resetScaleButton = document.getElementById("reset-scale");
    resetScaleButton.addEventListener("click", () => {
        scale = 10;
        scaleIndicator.textContent = Math.round((scale + Number.EPSILON) * 100) / 100;
        draw();
    });

    scaleSlider = document.getElementById("scale-slider");
    scaleIndicator = document.getElementById("scale-indicator");
    scaleSlider.addEventListener("input", (event) => {
        scaleIndicator.textContent = event.target.value;
        scale = event.target.value;
        draw();
    });

    canvas.addEventListener('mousemove', function (event) {
        if (event.buttons == 1) {
            event.preventDefault();
            directionX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            directionY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
            posOffset[0] += directionX;
            posOffset[1] += directionY;
            draw();
        }
    });

    darkModeToggle = document.getElementById("theme-toggle");
    darkModeToggle.addEventListener("input", function (event) {
        isDarkmode = event.target.checked;
        if (isDarkmode) {
            document.body.style.backgroundColor = "#424242"
            document.body.style.color = "#e8e8e8"
        } else {
            document.body.style.backgroundColor = "#ffffff"
            document.body.style.color = "#000000"
        }
    });

    initStageNames();
    canvasSize();
});



function initStageNames() {
    let starters = '<label data-title="starter"><h4>Starters:</h4></label>';
    let counters = '<label data-title="counter"><h4>Counterpicks:</h4></label>';
    for (let i = 0; i < stages.length; i++) {
        let data = `<label data-stage=\"${stages[i].name}\"><input type="checkbox" data-type="stage"><span>${stages[i].name}</span></label>`;
        stages[i].isCounterpick ? counters += data : starters += data
    }
    document.getElementById('stagelist').innerHTML = starters + counters;
    document.querySelector(`[data-stage="${stages[1].name}"]`).querySelector("input").checked = true;

}

function canvasSize(w, h) {
    canvas.width = (typeof w === "number") ? w : document.body.clientWidth * window.devicePixelRatio;
    canvas.height = (typeof h === "number") ? h : document.body.clientHeight * window.devicePixelRatio;
    zoom = (typeof w === "number") ? w / 600 : Math.min(canvas.width / 550, canvas.height / 500);
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    let hueIndex = 0;
    let hueOffset = 22;

    for (let i = 0; i < stages.length; i++) {
        let stage = stages[i];
        stage.checked = document.querySelector(`[data-stage="${stages[i].name}"]`).querySelector("input").checked;

        let selectedStageCount = getSelectedStageCount();
        if ((stage.checked)) {
            let hue = hueIndex++ * 360 / selectedStageCount + (selectedStageCount < 3 ? hueOffset : 100);

            ctx.setLineDash([10, 10]);
            {
                let bounds = [
                    -(stage.length / 2) + -stage.blastzones[0],
                    (stage.length / 2) + stage.blastzones[0],
                    stage.blastzones[1],
                    -stage.blastzones[2]
                ];

                drawBounds(bounds, hue);
            }
            if (stage.plats) {
                for (let p = 0; p < stage.plats.length; p++) {
                    let plat = stage.plats[p];

                    drawPath([
                        [plat[1] / scale, plat[2] / scale],
                        [plat[1] / scale + plat[0] / scale, plat[2] / scale]
                    ], hue)
                    if (stage.x_variance == 0 && stage.y_variance != 0) {
                        let cfXY = getRealCoordinate((plat[1] + plat[0] / 2) / scale, plat[2] / scale);
                        let tPosXY = getRealCoordinate((plat[1] + plat[0] / 2 + stage.x_variance / 2) / scale, (plat[2] + stage.y_variance / 2) / scale);
                        let tNegXY = getRealCoordinate((plat[1] + plat[0] / 2 - stage.x_variance / 2) / scale, (plat[2] - stage.y_variance / 2) / scale);

                        ctx.globalCompositeOperation = 'lighter';
                        let tmpCol = color(hue + 15);
                        drawArrow(cfXY.x, cfXY.y, tNegXY.x, tNegXY.y, lineWidth / 4, tmpCol);
                        drawArrow(cfXY.x, cfXY.y, tPosXY.x, tPosXY.y, lineWidth / 4, tmpCol);
                        ctx.globalCompositeOperation = 'source-over';
                    } else if (stage.x_variance != 0 && stage.y_variance == 0) {
                        let lfXY = getRealCoordinate((plat[1]) / scale, plat[2] / scale);
                        let rfXY = getRealCoordinate((plat[1] + plat[0]) / scale, plat[2] / scale);

                        let tPosXY = getRealCoordinate(((plat[1] + plat[0]) / scale) + (stage.x_variance / 2) / scale, plat[2] / scale);
                        let tNegXY = getRealCoordinate((plat[1] / scale) - (stage.x_variance / 2) / scale, plat[2] / scale);

                        ctx.globalCompositeOperation = 'lighter';
                        let tmpCol = color(hue + 15);
                        drawArrow(rfXY.x, rfXY.y, tPosXY.x, tPosXY.y, lineWidth / 4, tmpCol);
                        drawArrow(lfXY.x, lfXY.y, tNegXY.x, tNegXY.y, lineWidth / 4, tmpCol);
                        ctx.globalCompositeOperation = 'source-over';
                    } else if (stage.name == "Aetherian Forest") {
                        ctx.globalCompositeOperation = 'lighter';

                        let cFrom = getRealCoordinate((stage.endpoints[0][0]) / scale, stage.endpoints[0][1] / scale);
                        let cTo = getRealCoordinate(stage.endpoints[1][0] / scale, stage.endpoints[1][1] / scale);

                        let cCP = getRealCoordinate((plat[1] + ([plat[0]] / 2)) / scale, -.2 / scale);

                        drawCurve(
                            cFrom.x, cFrom.y,
                            cTo.x, cTo.y,
                            cCP.x, cCP.y,
                            hue - 33,
                            lineWidth / 4);

                        ctx.globalCompositeOperation = 'source-over';

                    }
                }
            }


            ctx.setLineDash([]);
            if (stage.overrideStageShape) {
                let halfW = stage.length / 2;
                let halfAltW = stage.altLength / 2;

                switch (stage.name) {
                    case "Air Armada":
                        drawPath([
                            [-halfW / scale, 0],
                            [-halfAltW / scale, -stage.thickness / scale],
                            [halfAltW / scale, -stage.thickness / scale],
                            [halfW / scale, 0],
                            [-halfW / scale, 0]
                        ], hue);
                        break;
                    case "Hyperborean Harbor":
                        drawPath([
                            [-halfW / scale, 0],
                            [-halfW / scale,],
                            [-halfAltW / scale, 0],
                            [-halfAltW / scale, -stage.thickness / scale],
                            [halfAltW / scale, -stage.thickness / scale],
                            [halfAltW / scale, 0],
                            [halfW / scale, 0],
                            [-halfW / scale, 0],
                        ], hue);
                        break;
                }

            } else {
                drawStage(stage.length, stage.thickness, hue);
            }
            labelColor(stage.name, hue)
        } else {
            labelColor(stage.name)
        }
    }
}

function drawCurve(fromx, fromy, tox, toy, cpx, cpy, hue, lineWidth) {
    ctx.strokeStyle = color(hue);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.quadraticCurveTo(cpx, cpy, tox, toy);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function labelColor(name, hue) {
    var stageLabel = document.querySelector('[data-stage="' + name + '"]'),
        input = stageLabel.querySelector("input"),
        cColor = (typeof hue === "undefined") ? "transparent" : color(hue);

    input.style.backgroundColor = cColor;
}

function getSelectedStageCount() {
    let ret = 0;
    for (let i = 0; i < stages.length; i++) {
        if (stages[i].checked) {
            ret++;
        }
    }
    return ret;
}

function drawArrow(fromx, fromy, tox, toy, arrowWidth, color) {
    //variables to be used when creating the arrow
    var headlen = 10;
    var angle = Math.atan2(toy - fromy, tox - fromx);

    ctx.save();
    ctx.strokeStyle = color;

    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineWidth = arrowWidth;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7),
        toy - headlen * Math.sin(angle - Math.PI / 7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 7),
        toy - headlen * Math.sin(angle + Math.PI / 7));

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7),
        toy - headlen * Math.sin(angle - Math.PI / 7));

    //draws the paths created above
    ctx.stroke();
    ctx.restore();
}

function drawStage(width, height, hue) {
    width /= 2;
    drawBounds([-width, width, 0, -height], hue);
}


function drawBounds(coords, hue) {
    coords = coords.map(coords => coords / scale);

    drawPath([
        [coords[0], coords[2]],
        [coords[1], coords[2]],
        [coords[1], coords[3]],
        [coords[0], coords[3]],
        [coords[0], coords[2]]
    ], hue);
}

function drawPath(coords, hue) {
    var coord;

    ctx.beginPath();
    coord = getRealCoordinate(coords[0][0], coords[0][1]);
    ctx.moveTo(coord.x, coord.y);

    for (var i = 1; i < coords.length; i++) {
        coord = getRealCoordinate(coords[i][0], coords[i][1]);
        ctx.lineTo(coord.x, coord.y);
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color(hue);
    ctx.stroke();

}

function getRealSize(size) {
    return size * zoom;
}

function getRealCoordinate(x, y) {
    return {
        x: getRealSize(x) + canvas.width / 2 + posOffset[0],
        y: getRealSize(-y) + canvas.height / 2 + posOffset[1]
    };
}

function color(hue) {
    var s = 100, l = 50, a = 1;

    return "hsla(" + hue + ", " + s + "%, " + l + "%, " + a + ")";
}