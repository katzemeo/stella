var _itemCounter = 1000;
function _genItemID(prefix) {
  _itemCounter++;
  return `${prefix}-${_itemCounter}`;
}

function closePopupMenu() {
  const menu = document.getElementById("context-menu");
  menu.style.display = 'none';
}

function findItemById(itemId) {
  const objects = _canvas.getObjects();
  for (let i=0; i<objects.length; i++) {
    if (objects[i].id === itemId) {
      return objects[i];
    }
  }
  return null;
}

function setItemStatus(itemId, itemStatus) {
  const item = findItemById(itemId);
  if (item) {
    item.set({status: itemStatus});
    notifyMapUpdate("setItemStatus", true);
    _canvas.requestRenderAll();
  }
  closePopupMenu();
}

function _genPolyPoints(sides, radius) {
  const sweep = Math.PI * 2 / sides;
  const cx = radius;
  const cy = radius;
  const points = [];
  for (var i = 0; i < sides; i++) {
    let x = cx + radius * Math.cos(i * sweep);
    let y = cy + radius * Math.sin(i * sweep);
    points.push({ x: x, y: y });
  }
  return (points);
}

function _createPentagon() {
  const points = _genPolyPoints(5, 75);
  const poly = new fabric.Polygon(points, {
    left: 250,
    top: 250,
    angle: 270,
    fill: '#F06292',
    stroke: "#880E4F",
    strokeWidth: 2
  });
  return poly;
}

function _createHexagon() {
  const points = _genPolyPoints(6, 75);
  const poly = new fabric.Polygon(points, {
    left: 50,
    top: 50,
    fill: '#0CB620',
    stroke: "#01740F",
    strokeWidth: 2
  });
  return poly;
}

function _createStar(id, sp) {
  let rect = new fabric.Rect();
  rect.set({
    width: 150, height: 100, fill: '#f55', stroke: "#0CB620", strokeWidth: 2,
    rx: 8, ry: 8,
    originX: "center",
    originY: "center"
  });
  let text = new fabric.Text(`<${id}>\n ${sp} SP`, {
    fontSize: 30,
    originX: "center",
    originY: "center"
  });

  var item = new fabric.Group([rect, text], {
    id: id,
    sp: sp,
    left: 150,
    top: 100
  });
  return item;
}

function _initDraw(width, height, map) {
  //console.log(`_initDraw() - ${width}, ${height}, ${map})`);
  var $ = function(id) { return document.getElementById(id); };
  var show = function(el,v) { el.style.display = v ? "" : "none"; }

  var origWidth = width;
  var origHeight = height;

  var canvas = new fabric.Canvas('canvas', {
    isDrawingMode: false,
    fireRightClick: true,
    selection: _mode === "edit",
    defaultCursor: 'default',
    hoverCursor: _mode === "edit" ? 'grab' : 'default',
    moveCursor: _mode === "edit" ? 'grabbing' : 'default',
    backgroundColor: null
  });

  const originalToImage = fabric.Image.prototype.toObject;
  const myAdditional = ['url'];
  fabric.Image.prototype.toObject = function (additionalProperties) {
    return originalToImage.call(this, myAdditional.concat(additionalProperties));
  }

  fabric.Object.prototype.transparentCorners = false;
  const canvasDivEl = $('canvas-div'),
    editModeEl = $('edit-mode'),
    viewModeEl = $('view-mode'),
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
  const uiElements = [ /*undoEl, redoEl,*/ drawingModeEl, shapeModeEl, textModeEl, alignModeEl, propertiesModeEl, selectAllEl,
    groupEl, ungroupEl, toFrontEl, toBackEl, rotateLeftEl, rotateRightEl, deleteEl, clearEl ];

  function setCanvasWidth(width, render=false) {
    origWidth = canvas.width;
    $('canvas').width = width;
    canvas.setWidth(width);
    if (render) {
      canvas.requestRenderAll();
    }
    return origWidth;
  }

  function setCanvasHeight(height, render=false) {
    origHeight = canvas.height;
    $('canvas').height = height;
    canvas.setHeight(height);
    if (render) {
      canvas.requestRenderAll();
    }
    return origHeight;
  }

  fabric.util.addListener(document.getElementsByClassName('upper-canvas')[0], 'contextmenu', function (e) {
    let target = canvas.findTarget(e, false);
    let type = null;
    if (target) {
      type = target.type;
    } else {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    e.preventDefault();

    const menu = $("context-menu");
    if (type === "feat" || type === "item") {
      buildItemPopupMenu(target, menu);
      menu.style.display = 'block';
      menu.style.left = e.pageX+"px";
      menu.style.top = e.pageY+"px";
    } else {
      menu.style.display = 'none';
    }
  
    return false;
  });

  function buildItemPopupMenu(target, menu) {
    removeChildren(menu);
    let mi = document.createElement("span");
    mi.className = "list-group-item list-group-item-secondary";
    mi.innerHTML = `<h5 class="mb-1"><span class="text-decoration-underline">${target.id}</span> Status</h5>`;
    menu.appendChild(mi);

    const meta = META[target.type].status;
    const value = target.status;
    meta.values.forEach((v) => {
      let caption = v;
      let icon = "";
      if (meta.captions) {
        caption = meta.captions[v] ?? toCaptionFromIdentifier(v);
      }

      let className = "list-group-item list-group-item-action";
      if (v === "backlog") {
        icon = "schedule";
        //className = "list-group-item list-group-item-action list-group-item-dark";
      } else if (v === "pending") {
        icon = "pending";
        //className = "list-group-item list-group-item-action list-group-item-warning";
      } else if (v === "ready") {
        icon = "calendar_today";
        //className = "list-group-item list-group-item-action list-group-item-primary";
      } else if (v === "blocked") {
        icon = "block";
        //className = "list-group-item list-group-item-action list-group-item-danger";
      } else if (v === "inprogress") {
        icon = "hourglass_empty";
        //className = "list-group-item list-group-item-action list-group-item-info";
      } else if (v === "completed" || v === "complete") {
        icon = "check_circle";
        //className = "list-group-item list-group-item-action list-group-item-success";
      } else {
        console.log(`Unknown status value "${v}"`);
        //icon = "pending";
        //className = "list-group-item list-group-item-action list-group-item-light";
      }

      if (v !== value) {
        mi = document.createElement("a");
        mi.className = className;
        mi.href = "#";
        mi.setAttribute("onclick", `setItemStatus("${target.id}", "${v}"); return false;`);
      } else {
        mi = document.createElement("span");
        mi.className = "list-group-item active";
      }
      mi.innerHTML = `<i class="material-icons">${icon}</i> ${caption}`;
      menu.appendChild(mi);
    });
  }

  $('download').onclick = saveCanvasImage;
  $('file-download').onclick = saveActiveImage;
  $('file-name').value = map.name ?? 'stella_canvas';

  function saveCanvasImage(e) {
    downloadImage(this, canvas);
  }

  function saveActiveImage(e) {
    let target = canvas.getActiveObject();
    if (target) {
      downloadImage(this, target);
    } else {
      alert("Please select object(s) to save!");
    }
  }

  function downloadImage(link, target) {
    let filename = $('file-name').value.trim() ?? 'stella_canvas';
    const format = $('file-type').value.toLowerCase() ?? 'png';
    if (filename.indexOf('.') < 0) {
      filename = `${filename}.${format}`;
    }
    if (format === "jpeg" || format === "png") {
      link.href = target.toDataURL({
        format: format,
        quality: 0.8
      });
    } else if (format === "svg") {
      const data = target.toSVG();
      link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    } else {
      const data = JSON.stringify(target.toJSON());
      link.href = 'data:application/json,' + encodeURIComponent(data);
    }
    link.download = filename;
  }

  const autosaveEl = $('autosave');
  autosaveEl.checked = _autosave;
  autosaveEl.onchange = function() {
    _autosave = autosaveEl.checked;
  };

  fabric.Object.prototype.selectable =  _mode === "edit";
  fabric.Image.prototype.hoverCursor = "pointer";
  updatePropertiesMode();
  show(editModeEl, _mode !== "edit");
  show(viewModeEl, _mode !== "view");
  uiElements.forEach((el) => {
    show(el, _mode === "edit");
  });

  setCanvasWidth(width);
  $('canvas-width').valueAsNumber = width;
  setCanvasHeight(height);
  $('canvas-height').valueAsNumber = height;
  if (map.canvasData) {
    canvas.loadFromJSON(map.canvasData);
  }
  if (canvas.backgroundColor) {
    $('canvas-background').value = canvas.backgroundColor;
  }
  $('canvas-bg-use').checked = canvas.backgroundColor !== undefined;

  $('canvas-width').onchange = function() {
    notifyMapUpdate("canvas-width", true);
    setCanvasWidth($('canvas-width').valueAsNumber, true);
  };
  $('canvas-height').onchange = function() {
    notifyMapUpdate("canvas-height", true);
    setCanvasHeight($('canvas-height').valueAsNumber, true);
  };
  $('canvas-background').onchange = function() {
    notifyMapUpdate("canvas-background", true);
    if ($('canvas-bg-use').checked) {
      _canvas.backgroundColor = $('canvas-background').value;
      _canvas.requestRenderAll();
    }
  };
  $('canvas-bg-use').onchange = function() {
    notifyMapUpdate("canvas-bg-use", true);
    if ($('canvas-bg-use').checked) {
      _canvas.backgroundColor = $('canvas-background').value;
    } else {
      delete _canvas.backgroundColor;
    }
    _canvas.requestRenderAll();
  };

  // Pan support
  canvas.on('mouse:down', function(opt) {
    const e = opt.e;
    if (opt.button === 1 && (e.altKey || _mode !== "edit")) {
      this.defaultCursor = 'grab';
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }

    if (opt.button !== 3) {
      closePopupMenu();
    }
  });
  canvas.on('mouse:move', function(opt) {
    if (opt.button === 1 && this.isDragging) {
      const e = opt.e;
      var vpt = this.viewportTransform;
      vpt[4] += e.clientX - this.lastPosX;
      vpt[5] += e.clientY - this.lastPosY;
      this.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
  });
  canvas.on('mouse:up', function(opt) {
    // On mouse up recalculate new interaction for all objects
    this.setViewportTransform(this.viewportTransform);
    this.defaultCursor = 'default';
    this.isDragging = false;
    this.selection = _mode === "edit";
    _originalTransformMove = null;
    _originalTransformScale = null;

    // Open URL in view mode (if set)
    if (opt.button === 1 && _mode !== "edit") {
      if (_targetURL) {
        try {
          if (Boolean(new URL(_targetURL))) {
            window.open(_targetURL, "stella_link");
          }
        } catch (e) { }
        _targetURL = null;
      }
    }
  });

  let _targetURL = null;
  canvas.on('mouse:over', function(opt) {
    if (opt.target && !_targetURL) {
      const obj = opt.target;
      if (obj.url) {
        _targetURL = obj.url;
        writeMessage(_targetURL);
      }  else if (obj.id || obj.summary) {
        let assigneeText = "";
        writeMessage(`${obj.id ?? ""} [${obj.status ? obj.status.toUpperCase() : "Unknown"}] - "${obj.summary ?? ""}"${assigneeText}`);
      }
    }
  });

  canvas.on('mouse:out', function(opt) {
    if (_targetURL) {
      _targetURL = null;
      writeMessage("");
    }    
  });

  canvas.upperCanvasEl.onmouseenter = enableKeyboard;
  canvas.upperCanvasEl.onmouseleave = disableKeyboard;

  // Cancel "transform" support (with ESC key)
  canvas.on('object:moving', function(opt) {
    if (!_originalTransformMove) {
      _originalTransformMove = opt.transform.original;
      //console.log("moving", _originalTransformMove);
    }
    //writeMessage(`left: ${toFixed(opt.target.left)}, top: ${toFixed(opt.target.top)}`)
  });
  canvas.on('object:scaling', function(opt) {
    if (!_originalTransformScale) {
      _originalTransformScale = opt.transform.original;
      //console.log("scaling", _originalTransformScale);
    }
    //writeMessage(`scale-x: ${toFixed(opt.target.scaleX)}, scale-y: ${toFixed(opt.target.scaleY)}`)
  });

  // Zoom support
  function fixZoom(zoom) {
    zoom = toFixed(zoom);
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
    // Defer handling to allow an inflight events to complete / avoid race condition
    // i.e. allow handlePropertyChange() to complete before changing _currentObject
    setTimeout(function() {
      if (selectedObject) {
        writeMessage(`Object of type "${selectedObject.type}" selected`);
      } else if (_currentObject) {
        writeMessage("");
      }
      _currentObject = selectedObject;
      refreshObjectProperties();
    }, 100);
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

  canvas.on('object:modified', function(e) {
    refreshObjectProperties();
    notifyMapUpdate("object:modified", true);
  });

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
      left: 125, top: 75, radius: 75, fill: "#EBDA24", stroke: "#B2A515", strokeWidth: 2, padding: 0
    });
    canvas.add(circle);
    notifyMapUpdate("circle", true);
  };

  $("add-triangle").onclick = function() {
    var triangle = new fabric.Triangle({
      left: 50, top: 150, width: 150, height: 150, fill: "#085ADD", stroke: "#06168E", strokeWidth: 2, padding: 0
    });
    canvas.add(triangle);
    notifyMapUpdate("triangle", true);
  };

  $("add-rect").onclick = function() {
    var rect = new fabric.Rect();
    rect.set({
      left: 10, top: 10, width: 150, height: 100, fill: "#C16767", stroke: "#BF4040", strokeWidth: 2, opacity: 0.7, padding: 0
    });
    canvas.add(rect);
    notifyMapUpdate("rect", true);
  };

  $("add-pentagon").onclick = function() {
    canvas.add(_createPentagon());
    notifyMapUpdate("pentagon", true);
  };

  $("add-hexagon").onclick = function() {
    canvas.add(_createHexagon());
    notifyMapUpdate("hexagon", true);
  };

  $("add-diamond").onclick = function() {
    var rect = new fabric.Rect({
      left: 275,
      top: 150,
      fill: '#F06292',
      width: 150,
      height: 150,
      strokeWidth: 2,
      stroke: "#880E4F",
      rx: 10,
      ry: 10,
      angle: 45
    });
    canvas.add(rect);
    notifyMapUpdate("diamond", true);
  };

  $("add-code").onclick = function() {
    canvas.add(_createItem(_genItemID("ITEM"), 8));
    notifyMapUpdate("item", true);
  };

  $("add-code-block").onclick = function() {
    canvas.add(_createFeat(_genItemID("FEAT"), 30));
    notifyMapUpdate("feat", true);
  };

  $("add-text").onclick = function() {
    let caption = textCaptionEl.value.trim();
    var text = new fabric.Text(caption !== "" ? caption : "Stella", {
      fill: 'orange',
      left: 150,
      top: 15,
    });
    canvas.add(text);
    notifyMapUpdate("text", true);
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
    canvas.requestRenderAll();
  }

  rotateLeftEl.onclick = function() {
    rotateObject(-90);
  };

  rotateRightEl.onclick = function() {
    rotateObject(90);
  };

  function fitToCanvas() {
    let activeObj = null;
    if (_mode === "edit") {
      activeObj = canvas.getActiveObject();
      setCanvasWidth(origWidth);
      setCanvasHeight(origHeight);
    } else {
      let headerEl = document.getElementById("header");
      let footerEl = document.getElementById("footer");
      let adjustHeight = headerEl.offsetHeight + footerEl.offsetHeight;
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight - adjustHeight);
    }

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
  }
  $("fit_canvas").onclick = fitToCanvas;

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

  deleteEl.onclick = deleteActiveObject
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
      writeMode(_mode === "edit" ? "Select" : "View");
    }
  }
  drawingModeEl.onclick = function() {
    if (_mode === "edit") {
      canvas.isDrawingMode = !canvas.isDrawingMode;
      updateDrawingMode();
    }
  };
  updateDrawingMode();

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