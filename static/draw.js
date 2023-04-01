
function _initDraw(width, height, json=null) {
  var $ = function(id){return document.getElementById(id)};

  /*
  const originalToObject = fabric.Object.prototype.toObject;
  const myAdditional = ['url'];
  fabric.Object.prototype.toObject = function (additionalProperties) {
      return originalToObject.call(this, myAdditional.concat(additionalProperties));
  }
  */

  fabric.Object.prototype.transparentCorners = false;
  const canvasDivEl = $('canvas-div'),
    optionsEl = $('options'),
    drawingModeEl = $('drawing-mode'),
    drawingOptionsEl = $('drawing-mode-options'),
    drawingColorEl = $('drawing-color'),
    drawingShadowColorEl = $('drawing-shadow-color'),
    drawingLineWidthEl = $('drawing-line-width'),
    drawingShadowWidth = $('drawing-shadow-width'),
    drawingShadowOffset = $('drawing-shadow-offset'),
    shapeModeEl = $('shape-mode'),
    shapeOptionsEl = $('shape-options'),
    textModeEl = $('text-mode'),
    textOptionsEl = $('text-options'),
    alignModeEl = $('align-mode'),
    alignOptionsEl = $('align-mode-options'),
    propertiesModeEl = $('properties-mode'),
    zoomLevelEl = $('zoom-level'),
    zoomLevelRangeEl = $('zoom-level-range'),
    textCaptionEl = $('text-caption'),
    clearEl = $('clear-canvas');

  function setCanvasWidth(width, render=false) {
    $('canvas').width = width;
    canvas.setWidth(width);
    if (render) {
      canvas.renderAll();
    }
  }

  function setCanvasHeight(height, render=false) {
    $('canvas').height = height;
    canvas.setHeight(height);
    if (render) {
      canvas.renderAll();
    }
  }

  $('download').addEventListener('click', saveImage, false);
  function saveImage(e) {
    let filename = $('file-name').value.trim() ?? 'stella_canvas';
    const format = $('file-type').value.toLowerCase() ?? 'png';
    if (filename.indexOf('.') < 0) {
      filename = `${filename}.${format}`;
    }
    if (format === "jpeg" || format === "png") {
      this.href = canvas.toDataURL({
        format: format,
        quality: 0.8
      });  
    } else if (format === "svg") {
      const data = canvas.toSVG(); 
      this.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    } else {
      const data = JSON.stringify(canvas.toJSON());
      this.href = 'data:application/json,' + encodeURIComponent(data);
    }
    this.download = filename;
  }

  var canvas = new fabric.Canvas('canvas', {
    isDrawingMode: false,
    backgroundColor: null
  });

  setCanvasWidth(width);
  $('canvas-width').valueAsNumber = width;
  setCanvasHeight(height);
  $('canvas-height').valueAsNumber = height;
  if (json) {
    canvas.loadFromJSON(json);
  }
  updateDrawingMode();

  $('canvas-width').onchange = function() {
    setCanvasWidth($('canvas-width').valueAsNumber, true);
  };
  $('canvas-height').onchange = function() {
    setCanvasHeight($('canvas-height').valueAsNumber, true);
  };

  // Pan support
  canvas.on('mouse:down', function(opt) {
    var evt = opt.e;
    if (evt.altKey === true) {
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
    }
  });
  canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
      var e = opt.e;
      var vpt = this.viewportTransform;
      vpt[4] += e.clientX - this.lastPosX;
      vpt[5] += e.clientY - this.lastPosY;
      this.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:up', function(opt) {
    // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
  });
  
  // Zoom support
  function fixZoom(zoom) {
    zoom = Number(zoom.toFixed(2));
    if (zoom > 5) zoom = 5;
    else if (zoom < 0.1) zoom = 0.1;
    else if (isNaN(zoom)) zoom = 1;
    return zoom;
  }

  function updateZoomValues(origin = true) {
    if (origin) {
      canvas.viewportTransform[4] = canvas.viewportTransform[5] = 0;
    }
    zoomLevelEl.valueAsNumber = canvas.getZoom();
    zoomLevelRangeEl.valueAsNumber = canvas.getZoom();
  }

  canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, fixZoom(zoom));
    opt.e.preventDefault();
    opt.e.stopPropagation();
    updateZoomValues(false);
  });

  zoomLevelEl.onchange = function() {
    canvas.setZoom(fixZoom(zoomLevelEl.valueAsNumber));
    updateZoomValues();
  };

  zoomLevelRangeEl.onchange = function() {
    canvas.setZoom(fixZoom(zoomLevelRangeEl.valueAsNumber));
    updateZoomValues();
  };

  function handleSelection(e) {
    if (e.selected && e.selected.length === 1) {
      console.log(e.selected[0]);
    }
  }
  canvas.on('selection:created', function(e) {
    handleSelection(e);
  });
  canvas.on('selection:updated', function(e) {
    handleSelection(e);
  });
  canvas.on('selection:cleared', function(e) {
    handleSelection(e);
  });

  $("add-circle").onclick = function() {
    var circle = new fabric.Circle({
      radius: 20, fill: 'green', left: 100, top: 100, padding: 0
    });
    //circle.set({url: "https://domain.tld"});
    canvas.add(circle);
  };

  $("add-triangle").onclick = function() {
    var triangle = new fabric.Triangle({
      width: 20, height: 30, fill: 'blue', left: 50, top: 50, padding: 0
    });
    canvas.add(triangle);
  };

  $("add-rect").onclick = function() {
    var rect = new fabric.Rect();
    rect.set({ width: 40, height: 30, fill: '#f55', opacity: 0.7, padding: 0 });
    canvas.add(rect);
  };

  $("add-text").onclick = function() {
    let caption = textCaptionEl.value.trim();
    var text = new fabric.Text(caption !== "" ? caption : "Stella", {
      fill: 'orange'
    });
    canvas.add(text);
  };

  function selectAll() {
    canvas.discardActiveObject();
    var sel = new fabric.ActiveSelection(canvas.getObjects(), {
      canvas: canvas,
    });
    canvas.setActiveObject(sel);
    return sel;
  }

  const selectAllEl = $("select_all");
  selectAllEl.onclick = function() {
    selectAll();
    canvas.requestRenderAll();
  };

  const groupEl = $("group");
  groupEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    if (activeObj.type !== 'activeSelection') {
      return;
    }
    activeObj.toGroup();
    canvas.requestRenderAll();
  };

  const ungroupEl = $("ungroup");
  ungroupEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    if (activeObj.type !== 'group') {
      return;
    }
    activeObj.toActiveSelection();
    canvas.requestRenderAll();
  };

  const toFrontEl = $("to_front");
  toFrontEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.bringToFront();
    canvas.discardActiveObject();
  };

  const toBackEl = $("to_back");
  toBackEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.sendToBack();
    canvas.discardActiveObject();
  };

  function rotateObject(angleOffset) {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    var angle = activeObj.angle + angleOffset;
    angle = angle > 360 ? 90 : angle < 0 ? 270 : angle;
    activeObj.rotate(angle).setCoords();
    canvas.renderAll();
  }

  $("rotate_left").onclick = function() {
    rotateObject(-90);
  };
  $("rotate_right").onclick = function() {
    rotateObject(90);
  };

  $("fit_canvas").onclick = function() {
    let activeObj = canvas.getActiveObject();
    if (!activeObj) {
      activeObj = selectAll();
    }
    let scaleX = canvas.width / activeObj.width;
    let scaleY = canvas.height / activeObj.height;
    if (scaleX > scaleY) {
      scaleX = scaleY;
    }
    activeObj.set({
      top: 0,
      left: 0,
      scaleY: scaleX,
      scaleX: scaleX
    });
    canvas.setZoom(1);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    updateZoomValues();
  };

  const centerEl = $("center");
  centerEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.center();
  };

  const centerHEl = $("center_h");
  centerHEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.centerH();
  };

  const centerVEl = $("center_v");
  centerVEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.centerV();
  };

  const leftHEl = $("left_h");
  leftHEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ left: 0 });
    canvas.requestRenderAll();
  };

  const rightHEl = $("right_h");
  rightHEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ left: canvas.getWidth() - activeObj.getScaledWidth() });
    canvas.requestRenderAll();
  };

  const topVEl = $("top_v");
  topVEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ top: 0 });
    canvas.requestRenderAll();
  };

  const bottomVHEl = $("bottom_v");
  bottomVHEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ top: canvas.getHeight() - activeObj.getScaledHeight() });
    canvas.requestRenderAll();
  };

  const deleteEl = $("delete");
  deleteEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    if (activeObj.type === 'activeSelection') {
      activeObj.forEachObject(function(obj) {
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
    } else {
      canvas.remove(activeObj);
    }
  };

  clearEl.onclick = function() { canvas.clear() };

  function updateDrawingMode() {
    if (canvas.isDrawingMode) {
      drawingModeEl.classList.remove("btn-warning");
      drawingModeEl.classList.add("btn-success");
      drawingOptionsEl.style.display = '';
      writeMode("Draw");
    } else {
      drawingModeEl.classList.remove("btn-success");
      drawingModeEl.classList.add("btn-warning");
      drawingOptionsEl.style.display = 'none';
      writeMode("Select");
    }
  }
  drawingModeEl.onclick = function() {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    updateDrawingMode();
  };

  shapeModeEl.onclick = function() {
    if (!shapeOptionsEl.style.display) {
      shapeModeEl.classList.remove("btn-success");
      shapeModeEl.classList.add("btn-warning");
      shapeOptionsEl.style.display = 'none';
    } else {
      shapeModeEl.classList.remove("btn-warning");
      shapeModeEl.classList.add("btn-success");
      shapeOptionsEl.style.display = '';
    }
  };

  textModeEl.onclick = function() {
    if (!textOptionsEl.style.display) {
      textModeEl.classList.remove("btn-success");
      textModeEl.classList.add("btn-warning");
      textOptionsEl.style.display = 'none';
    } else {
      textModeEl.classList.remove("btn-warning");
      textModeEl.classList.add("btn-success");
      textOptionsEl.style.display = '';
    }
  };

  alignModeEl.onclick = function() {
    if (!alignOptionsEl.style.display) {
      alignModeEl.classList.remove("btn-success");
      alignModeEl.classList.add("btn-warning");
      alignOptionsEl.style.display = 'none';
    } else {
      alignModeEl.classList.remove("btn-warning");
      alignModeEl.classList.add("btn-success");
      alignOptionsEl.style.display = '';
    }
  };

  propertiesModeEl.onclick = function() {
    if (!optionsEl.style.display) {
      propertiesModeEl.classList.remove("btn-success");
      propertiesModeEl.classList.add("btn-warning");
      optionsEl.style.display = 'none';
      canvasDivEl.style.maxWidth = "100%";
    } else {
      propertiesModeEl.classList.remove("btn-warning");
      propertiesModeEl.classList.add("btn-success");
      optionsEl.style.display = '';
      canvasDivEl.style.maxWidth = "80%";
    }
  };

  if (fabric.PatternBrush) {
    var vLinePatternBrush = new fabric.PatternBrush(canvas);
    vLinePatternBrush.getPatternSrc = function() {
      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      var ctx = patternCanvas.getContext('2d');

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.stroke();

      return patternCanvas;
    };

    var hLinePatternBrush = new fabric.PatternBrush(canvas);
    hLinePatternBrush.getPatternSrc = function() {
      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      var ctx = patternCanvas.getContext('2d');

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(5, 10);
      ctx.closePath();
      ctx.stroke();

      return patternCanvas;
    };

    var squarePatternBrush = new fabric.PatternBrush(canvas);
    squarePatternBrush.getPatternSrc = function() {
      var squareWidth = 10, squareDistance = 2;
      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = squareWidth + squareDistance;
      var ctx = patternCanvas.getContext('2d');
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, squareWidth, squareWidth);
      return patternCanvas;
    };

    var diamondPatternBrush = new fabric.PatternBrush(canvas);
    diamondPatternBrush.getPatternSrc = function() {
      var squareWidth = 10, squareDistance = 5;
      var patternCanvas = fabric.document.createElement('canvas');
      var rect = new fabric.Rect({
        width: squareWidth,
        height: squareWidth,
        angle: 45,
        fill: this.color
      });

      var canvasWidth = rect.getBoundingRect().width;
      patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance;
      rect.set({ left: canvasWidth / 2, top: canvasWidth / 2 });

      var ctx = patternCanvas.getContext('2d');
      rect.render(ctx);

      return patternCanvas;
    };

    var img = new Image();
    img.src = 'assets/tp_subtle.png';
    var texturePatternBrush = new fabric.PatternBrush(canvas);
    texturePatternBrush.source = img;
  }

  $('drawing-mode-selector').onchange = function() {
    if (this.value === 'hline') {
      canvas.freeDrawingBrush = vLinePatternBrush;
    }
    else if (this.value === 'vline') {
      canvas.freeDrawingBrush = hLinePatternBrush;
    }
    else if (this.value === 'square') {
      canvas.freeDrawingBrush = squarePatternBrush;
    }
    else if (this.value === 'diamond') {
      canvas.freeDrawingBrush = diamondPatternBrush;
    }
    else if (this.value === 'texture') {
      canvas.freeDrawingBrush = texturePatternBrush;
    }
    else {
      canvas.freeDrawingBrush = new fabric[this.value + 'Brush'](canvas);
    }

    if (canvas.freeDrawingBrush) {
      var brush = canvas.freeDrawingBrush;
      brush.color = drawingColorEl.value;
      if (brush.getPatternSrc) {
        brush.source = brush.getPatternSrc.call(brush);
      }
      brush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
      brush.shadow = new fabric.Shadow({
        blur: parseInt(drawingShadowWidth.value, 10) || 0,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: drawingShadowColorEl.value,
      });
    }
  };

  drawingColorEl.onchange = function() {
    var brush = canvas.freeDrawingBrush;
    brush.color = this.value;
    if (brush.getPatternSrc) {
      brush.source = brush.getPatternSrc.call(brush);
    }
  };
  drawingShadowColorEl.onchange = function() {
    canvas.freeDrawingBrush.shadow.color = this.value;
  };
  drawingLineWidthEl.onchange = function() {
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;
  };
  drawingShadowWidth.onchange = function() {
    canvas.freeDrawingBrush.shadow.blur = parseInt(this.value, 10) || 0;
    this.previousSibling.innerHTML = this.value;
  };
  drawingShadowOffset.onchange = function() {
    canvas.freeDrawingBrush.shadow.offsetX = parseInt(this.value, 10) || 0;
    canvas.freeDrawingBrush.shadow.offsetY = parseInt(this.value, 10) || 0;
    this.previousSibling.innerHTML = this.value;
  };

  if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = drawingColorEl.value;
    if (canvas.freeDrawingBrush.getPatternSrc) {
      canvas.freeDrawingBrush.source = canvas.freeDrawingBrush.getPatternSrc.call(this);
    }
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
      blur: parseInt(drawingShadowWidth.value, 10) || 0,
      offsetX: 0,
      offsetY: 0,
      affectStroke: true,
      color: drawingShadowColorEl.value,
    });
  }

  return canvas;
};