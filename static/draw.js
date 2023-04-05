
function _initDraw(width, height, map) {
  var $ = function(id){return document.getElementById(id)};
  var show = function(el,v) { el.style.display = v ? "" : "none"; }
  var origWidth = width;
  var origHeight = height;

  const originalToImage = fabric.Image.prototype.toObject;
  const myAdditional = ['url'];
  fabric.Image.prototype.toObject = function (additionalProperties) {
    return originalToImage.call(this, myAdditional.concat(additionalProperties));
  }

  fabric.Object.prototype.transparentCorners = false;
  const canvasDivEl = $('canvas-div'),
    undoEl = $('undo'),
    redoEl = $('redo'),
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
    selectAllEl = $("select_all"),
    objectPropsEl = $('object-props'),
    zoomLevelEl = $('zoom-level'),
    zoomLevelRangeEl = $('zoom-level-range'),
    textCaptionEl = $('text-caption'),
    groupEl = $("group"),
    ungroupEl = $("ungroup"),
    toFrontEl = $("to_front"),
    toBackEl = $("to_back"),
    rotateLeftEl = $("rotate_left"),
    rotateRightEl = $("rotate_right"),  
    deleteEl = $("delete"),
    clearEl = $('clear-canvas');
  const uiElements = [ undoEl, redoEl, drawingModeEl, shapeModeEl, textModeEl, alignModeEl, propertiesModeEl, selectAllEl,
    groupEl, ungroupEl, toFrontEl, toBackEl, rotateLeftEl, rotateRightEl, deleteEl, clearEl ];

  function setCanvasWidth(width, render=false) {
    origWidth = canvas.width;
    $('canvas').width = width;
    canvas.setWidth(width);
    if (render) {
      canvas.renderAll();
    }
    return origWidth;
  }

  function setCanvasHeight(height, render=false) {
    origHeight = canvas.height;
    $('canvas').height = height;
    canvas.setHeight(height);
    if (render) {
      canvas.renderAll();
    }
    return origHeight;
  }

  $('download').addEventListener('click', saveImage, false);
  $('file-name').value = map.name ?? 'stella_canvas';
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

  fabric.Object.prototype.selectable =  _mode === "edit";
  fabric.Image.prototype.hoverCursor = "pointer";
  updatePropertiesMode();
  uiElements.forEach((el) => {
    show(el, _mode === "edit");
  });

  var canvas = new fabric.Canvas('canvas', {
    isDrawingMode: false,
    selection: _mode === "edit",
    defaultCursor: 'default',
    hoverCursor: _mode === "edit" ? 'grab' : 'default',
    moveCursor: _mode === "edit" ? 'grabbing' : 'default',
    backgroundColor: null
  });

  setCanvasWidth(width);
  $('canvas-width').valueAsNumber = width;
  setCanvasHeight(height);
  $('canvas-height').valueAsNumber = height;
  if (map.canvasData) {
    canvas.loadFromJSON(map.canvasData);
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
    const e = opt.e;
    if (e.altKey || _mode !== "edit") {
      this.defaultCursor = 'grab';
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
      const e = opt.e;
      /*
      if (e.altKey) {
        this.defaultCursor = 'grabbing';
      }
      */
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
    this.defaultCursor = 'default';
    this.isDragging = false;
    this.selection = _mode === "edit";

    if (targetURL &&  _mode !== "edit") {
      window.open(targetURL, "stella_link");
      targetURL = null;
    }
  });

  let targetURL = null;
  canvas.on('mouse:over', function(opt) {
    if (opt.target) {
      const obj = opt.target;
      if (!targetURL && obj.url) {
        targetURL = obj.url;
        writeMessage(targetURL);
      }
    } else {
      enableKeyboard();
    }
  });

  canvas.on('mouse:out', function(opt) {
    if (targetURL) {
      targetURL = null;
      writeMessage("");
    } if (!opt.target) {
      disableKeyboard();
    }
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

  $("zoom_in").onclick = function() {
    canvas.setZoom(fixZoom(canvas.getZoom() + 0.1));
    updateZoomValues();
  };

  $("zoom_out").onclick = function() {
    canvas.setZoom(fixZoom(canvas.getZoom() - 0.1));
    updateZoomValues();
  };

  function getCurrentObject() {
    let activeObj = _canvas.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      activeObj = null;
    }
    return activeObj;
  }
  
  function handleSelectionChange() {
    let selectedObject = getCurrentObject();
    if (selectedObject) {
      writeMessage(`Object of type "${selectedObject.type}" selected`);
    } else if (_currentObject) {
      writeMessage("");
    }
    _currentObject = selectedObject;
    refreshObjectProperties();
  }

  function refreshObjectProperties() {
    removeChildren(objectPropsEl);
    if (_currentObject) {
      createObjectControls(objectPropsEl, _currentObject);
      show(objectPropsEl, true);
    } else {
      show(objectPropsEl, false);
    }
  }

  canvas.on('selection:created', function(e) {
    handleSelectionChange();
  });
  canvas.on('selection:updated', function(e) {
    handleSelectionChange();
  });
  canvas.on('selection:cleared', function(e) {
    handleSelectionChange();
  });

  $("add-circle").onclick = function() {
    var circle = new fabric.Circle({
      radius: 20, fill: '#00ff00', left: 100, top: 100, padding: 0
    });
    canvas.add(circle);
    updateMapName(true);
  };

  $("add-triangle").onclick = function() {
    var triangle = new fabric.Triangle({
      width: 20, height: 30, fill: 'blue', left: 50, top: 50, padding: 0
    });
    canvas.add(triangle);
    updateMapName(true);
  };

  $("add-rect").onclick = function() {
    var rect = new fabric.Rect();
    rect.set({ width: 40, height: 30, fill: '#f55', opacity: 0.7, padding: 0 });
    canvas.add(rect);
    updateMapName(true);
  };

  $("add-diamond").onclick = function() {
    var rect = new fabric.Rect({
      left: 200,
      top: 50,
      fill: '#F06292',
      width: 100,
      height: 100,
      strokeWidth: 2,
      stroke: "#880E4F",
      rx: 10,
      ry: 10,
      angle: 45,
      hasControls: true
    });
    canvas.add(rect);
    updateMapName(true);
  };

  $("add-text").onclick = function() {
    let caption = textCaptionEl.value.trim();
    var text = new fabric.Text(caption !== "" ? caption : "Stella", {
      fill: 'orange'
    });
    canvas.add(text);
    updateMapName(true);
  };

  function selectAll() {
    canvas.discardActiveObject();
    var sel = new fabric.ActiveSelection(canvas.getObjects(), {
      canvas: canvas,
    });
    canvas.setActiveObject(sel);
    return sel;
  }

  selectAllEl.onclick = function() {
    if (_mode === "edit") {
      selectAll();
      canvas.requestRenderAll();  
    }
  };

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
    handleSelectionChange();
  };

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

  toFrontEl.onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.bringToFront();
    canvas.discardActiveObject();
  };

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

  rotateLeftEl.onclick = function() {
    rotateObject(-90);
  };

  rotateRightEl.onclick = function() {
    rotateObject(90);
  };

  $("fit_canvas").onclick = function() {
    let activeObj = canvas.getActiveObject();
    if (!activeObj) {
      if (_mode === "edit") {
        setCanvasWidth(origWidth);
        setCanvasHeight(origHeight);
      } else {
        setCanvasWidth(window.innerWidth);
        setCanvasHeight(window.innerHeight);
      }
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

  $("right_h").onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ left: canvas.getWidth() - activeObj.getScaledWidth() });
    canvas.requestRenderAll();
  };

  $("top_v").onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ top: 0 });
    canvas.requestRenderAll();
  };

  $("bottom_v").onclick = function() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      return;
    }
    activeObj.set({ top: canvas.getHeight() - activeObj.getScaledHeight() });
    canvas.requestRenderAll();
  };

  deleteEl.onclick = deleteCurrentObject
  clearEl.onclick = function() {
    if (_mode === "edit") {
      canvas.clear();
    }
  };

  function updateDrawingMode() {
    if (canvas.isDrawingMode) {
      drawingModeEl.classList.remove("btn-warning");
      drawingModeEl.classList.add("btn-success");
      show(drawingOptionsEl, true);
      writeMode("Draw");
    } else {
      drawingModeEl.classList.remove("btn-success");
      drawingModeEl.classList.add("btn-warning");
      show(drawingOptionsEl, false);
      writeMode("Select");
    }
  }
  drawingModeEl.onclick = function() {
    if (_mode === "edit") {
      canvas.isDrawingMode = !canvas.isDrawingMode;
      updateDrawingMode();  
    }
  };

  shapeModeEl.onclick = function() {
    if (!shapeOptionsEl.style.display) {
      shapeModeEl.classList.remove("btn-success");
      shapeModeEl.classList.add("btn-warning");
      show(shapeOptionsEl, false);
    } else {
      shapeModeEl.classList.remove("btn-warning");
      shapeModeEl.classList.add("btn-success");
      show(shapeOptionsEl, true);
    }
  };

  textModeEl.onclick = function() {
    if (!textOptionsEl.style.display) {
      textModeEl.classList.remove("btn-success");
      textModeEl.classList.add("btn-warning");
      show(textOptionsEl, false);
    } else {
      textModeEl.classList.remove("btn-warning");
      textModeEl.classList.add("btn-success");
      show(textOptionsEl, true);
    }
  };

  alignModeEl.onclick = function() {
    if (!alignOptionsEl.style.display) {
      alignModeEl.classList.remove("btn-success");
      alignModeEl.classList.add("btn-warning");
      show(alignOptionsEl, false);
    } else {
      alignModeEl.classList.remove("btn-warning");
      alignModeEl.classList.add("btn-success");
      show(alignOptionsEl, true);
    }
  };

  function updatePropertiesMode(toggle=false) {
    if (_mode === "edit" && (!toggle || optionsEl.style.display)) {
      propertiesModeEl.classList.remove("btn-warning");
      propertiesModeEl.classList.add("btn-success");
      show(optionsEl, true);
      canvasDivEl.style.maxWidth = "80%";
    } else {
      propertiesModeEl.classList.remove("btn-success");
      propertiesModeEl.classList.add("btn-warning");
      show(optionsEl, false);
      canvasDivEl.style.maxWidth = "100%";
    }
  }
  propertiesModeEl.onclick = function() {
    updatePropertiesMode(true);
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