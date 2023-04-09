const JSON_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
};

const MY_MAP = "MY MAP";
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const NOW = new Date();
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Toronto";

// Application state (to be persisted)
var _maps = {};
var _mapName = null;
var _lastModified = NOW;

// Application UI related state
var _sortOrders = {};
var _sortKey = "";
var _mapNameParam = null;
var _modeParam = "view";
var _mode = _modeParam;
var _filterKeyParam = null;
var _filterKey = _filterKeyParam;
var _map = { name: MY_MAP };
var _userInfo = null;
var _canvas = null;
var _canvasSize = null;
var _currentObject = null;
var _autosave = true;

function clearState() {
  _maps = {};
  _mapName = _mapNameParam;
  _canvas = null;
}

window.onload = function () {
  const url = new URL(window.location.href);
  if (url.searchParams.has("map")) {
    _mapNameParam = url.searchParams.get("map");
    _mapName = _mapNameParam;
  }
  if (url.searchParams.has("mode")) {
    _modeParam = url.searchParams.get("mode");
    _mode = _modeParam;
  }
  if (url.searchParams.has("filter")) {
    _filterKeyParam = url.searchParams.get("filter");
    setFilterKey(_filterKeyParam);
  }

  if (restoreFromStorage()) {
    if (_mapName) {
      showMap(_mapName);
    }
  }

  if (!_mapName) {
    loadMyMap();
  }

  refreshMap();

  configureAutomaticSave();
  updateTooltips();
  initKeyboard();
  updateCanvasSelection();
};

function updateTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  });
}

var _modified = false;
var _state = null;
const saveToStorage = (force=false) => {
  if (localStorage && ((_modified && _autosave) || force)) {
    //console.log(`saveToStorage() - force=${force}, modified=${_modified}`);
    _state = {};
    _state._maps = _maps;
    _state._mapName = _mapName;
    _state._mode = _mode;
    if (_canvas) {
      _map.canvasData = _canvas.toJSON();
      if (_mode === "edit") {
        _state.canvasSize = { width: _canvas.getWidth(), height: _canvas.getHeight() };
      } else {
        _state.canvasSize = _canvasSize;
      }
    }
    _state.autosave = _autosave;
    _state.lastModified = _lastModified;
    localStorage.setItem("katzemeo.stella", JSON.stringify(_state));
    notifyMapUpdate("saveToStorage", false);
    writeMessage("Saved to local storage (Updated: "+ formatTime(_state.lastModified) +")");
    return true;
  } else if (!localStorage) {
    writeMessage("Local storage not supported!");
  }
  return false;
};

const restoreFromStorage = () => {
  if (localStorage) {
    _state = localStorage.getItem("katzemeo.stella");
    if (_state) {
      try {
        _state = JSON.parse(_state);
        _maps = _state._maps ?? {};
        _mapName = _mapNameParam ?? _state._mapName;
        _mode = _modeParam ?? _state._mode;
        _canvasSize = _state.canvasSize;
        _autosave = _state.autosave;
        _lastModified = _state.lastModified;
        writeMessage("Restored from local storage (Updated: "+ formatTime(_state.lastModified) +")");
        notifyMapUpdate("restoreFromStorage", false);
        return true;
      } catch (error) {
        console.log(error);
      }
    }
  } else if (!localStorage) {
    writeMessage("Local storage not supported!");
  }
  return false;
};

const deleteLocalStorage = () => {
  var r = confirm("Are you sure you want to delete all?");
  if (r != true) {
    return;
  }

  if (localStorage) {
    localStorage.removeItem("katzemeo.stella");
    writeMessage("Removed state from local storage. Refreshing...");
    clearState();
    setTimeout(function() { document.location.reload(); }, 1000);
  } else {
    writeMessage("Local storage not supported!");
  }
};

const configureAutomaticSave = () => {
  if (localStorage) {
    setInterval(saveToStorage, 60 * 1000);
    window.addEventListener('beforeunload', function (event) {
      event.stopImmediatePropagation();
      saveToStorage();
    });
  } else {
    writeMessage("Local storage not supported!");
  }
};

function formatDate(dt, timeZone = TIME_ZONE) {
  return dt ? new Date(dt).toLocaleDateString('en-us', { timeZone: timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "";
}

function formatTime(dt, timeZone = TIME_ZONE) {
  return dt ? new Date(dt).toLocaleTimeString('en-us', { timeZone: timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "";
}

function appendItem(parentEl, innerHTML, className = null) {
  let li = document.createElement("li");
  if (innerHTML) {
    li.innerHTML = innerHTML;
  }
  if (className) {
    li.className = className;
  }
  parentEl.appendChild(li);
}

function initCanvas(map, canvasSize=null) {
  if (_canvas) {
    if (!canvasSize) {
      canvasSize = { width: _canvas.getWidth(), height: _canvas.getHeight() };
    }
    _canvas.dispose();
  }
  if (!canvasSize) {
    let headerEl = document.getElementById("header");
    let footerEl = document.getElementById("footer");
    let adjustHeight = headerEl.offsetHeight + footerEl.offsetHeight;
    canvasSize = {
      width: _mode !== "edit" ? window.innerWidth : DEFAULT_WIDTH,
      height: window.innerHeight - adjustHeight
    };
  }
  _canvas = _initDraw(canvasSize.width, canvasSize.height, map);
}

function refreshMap(map = _map) {
  // Build maps picker
  let el = document.getElementById("maps");
  removeChildren(el);

  const numMaps = Object.keys(_maps).length;
  if (numMaps > 0) {
    createMapMI(el, MY_MAP, MY_MAP, false);
  } else if (numMaps < 1) {
    appendItem(el, `<a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#uploadFile">Upload Map File...</a>`);
  }

  for (const key in _maps) {
    let m = _maps[key];
    if (m.name !== MY_MAP) {
      createMapMI(el, m.name);
    }
  };

  setMap(map);
}

function createMapMI(el, name, removeOption = true) {
  let li = document.createElement("li");
  let a = document.createElement("a");
  a.className = "dropdown-item";
  a.href = `javascript:showMap("${name}")`;
  a.innerHTML = removeOption ? createRemoveMap(name) : `<span class="me-1" title="Show Map">${name}</span>`;
  li.appendChild(a);
  el.appendChild(li);
}

function createRemoveMap(name) {
  return `<span class="me-1" title="Show Map">${name}</span><button class="btn btn-muted mx-1" title="Remove Map" onclick="deleteMap(\'${name}\')"><i class="material-icons custom">delete</i></button>`;
}

function showMyMap() {
  var map = {
    name: MY_MAP,
  };

  if (!_maps[map.name]) {
    _maps[map.name] = map;
    _mode = "edit";
  } else {
    map = _maps[map.name];
  }

  setMap(map);
}

function showMap(mapName) {
  if (mapName == MY_MAP) {
    showMyMap();
  } else {
    if (_maps[mapName]) {
      setMap(_maps[mapName]);
    } else {
      //console.log("Map removed!");
    }
  }
}

function removeMap(mapName) {
  delete _maps[mapName];
  let map;
  if (Object.keys(_maps).length > 0) {
    map = Object.values(_maps)[0];
    _mapName = map.name;
  } else {
    showMyMap();
  }
  _modified = true;

  refreshMap(map);
}

function setFilterKey(filterKey) {
  _filterKey = filterKey;
  const el = document.getElementById("global_search");
  el.value = _filterKey;
}

function setMap(map) {
  const resetUI = (_map !== map);
  if (resetUI) {
    _filterKey = _filterKeyParam;
    saveToStorage();
  }

  _map = map;
  _mapName = _map && map.name ? map.name : MY_MAP;
  setFilterKey(_filterKey);

  _date = (_map && _map.date) ? new Date(_map.date) : new Date(NOW);
  enableDisableNavigation();
  initCanvas(map, _canvas ? null : _canvasSize);
  notifyMapUpdate("setMap", false);
}

function notifyMapUpdate(event, modified=_modified) {
  //writeMessage(`notify - "${event}" (modified=${modified})`, true);
  _modified = modified;
  if (modified) {
    _lastModified = new Date();
  }
  el = document.getElementById("map_name");
  el.innerText = _map.name + (_modified ? " *" : "");
  el.title = `${formatTime(_lastModified)}`;
}

function enableDisableNavigation() {
  // Empty
}

function searchKey(key) {
  _filterKey = document.getElementById(key).value;
  updateCanvasSelection();
}

const MAX_SELECTION = 20;
function updateCanvasSelection() {
  if (_filterKey && _filterKey.length > 2 && _canvas) {
    var filterKey = _filterKey && _filterKey.toLowerCase();
    let objects = _canvas.getObjects();
    const keys = ['id', 'summary', 'text'];
    objects = objects.filter(function (row) {
      return keys.some(function (key) {
        if (key === 'id') {
          return String(row[key]).toLowerCase() === filterKey;
        }
        return String(row[key]).toLowerCase().indexOf(filterKey) > -1;
      });
    });

    _canvas.discardActiveObject();
    if (objects.length > 0) {
      let sel = objects[0];
      let message = null;
      if (objects.length > 1) {
        message = `Found ${objects.length} matching objects`;
        if (objects.length > MAX_SELECTION) {
          objects = objects.slice(0, MAX_SELECTION);
          message += ` (selection limited to ${objects.length})`;
        }
        sel = new fabric.ActiveSelection(objects, {
          canvas: _canvas,
        });
      } else {
        message = `Found [${sel.id}] - "${sel.summary}"`;
      }
      writeMessage(message);
      _canvas.setActiveObject(sel);
    }
    _canvas.requestRenderAll();
  }
}

function processMap(data) {
  let map = _maps[data.name];
  if (!map) {
    map = {
      name: data.name
    };
  }

  map.name = map.name ?? MY_MAP;
  map.canvasData = data.canvasData ?? map.canvasData;
  initCanvas(map);

  if (!_maps[map.name]) {
    _mapName = map.name;
    _maps[map.name] = map;
    _modified = true;
  }

  refreshMap(map);

  return map;
}

function loadMyMap() {
  //loadMap("MY_MAP");
  showMyMap();
}

function loadMap(mapName) {
  let url = "/maps/"+ mapName;
  fetch(url, {
    method: "GET",
    headers: JSON_HEADERS,
  }).then((res) => {
    if (res.status == 200) {
      res.json().then((data) => {
        if (data) {
          if (Array.isArray(data)) {
            data.forEach(map => {
              processMap(map);
            });
            if (data.length > 1) {
              showMap(MY_MAP);
            } else if (data.length < 1) {
              refreshMap();
            }
          } else {
            processMap(data);
          }
        } else {
          refreshMap();
        }        
      });
    } else if (res.status == 204) {
      refreshMap();
    } else if (res.status == 413 || res.status == 415 || res.status == 422) {
      res.json().then((data) => {
        window.alert(data.msg);
      });
    } else {
      window.alert("Unexpected response code " + res.status);
    }
  }).catch((error) => {
    console.error(error);
    window.alert("Unable to load map information.  Please try again.");
  });
}

const removeChildren = (parent, header = 0) => {
  while (parent.lastChild && parent.childElementCount > header) {
    parent.removeChild(parent.lastChild);
  }
};

function renderCell(row, value, colspan) {
  let cell = document.createElement("td");
  if (colspan) {
    cell.setAttribute("colspan", colspan);
  }
  cell.innerHTML = value ?? "N/A";
  row.appendChild(cell);
  return cell;
}

function writePrefix(prefix) {
  const el = document.getElementById("message-prefix");
  el.innerHTML = prefix;
}

function writeMessage(msg, consolelog=false) {
  const el = document.getElementById("message-text");
  el.value = msg;
  if (consolelog) {
    console.log(msg);
  }
}

function writeMode(mode) {
  const el = document.getElementById("message-mode");
  el.innerHTML = mode;
}

async function postFile(blob, fileName, data, onSuccess) {
  if (fileName.endsWith(".svg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")) {
    readImageFile(blob, onSuccess);
  } else if (data === "maps") {
    postMapFile(blob, fileName, onSuccess);
  }
}

function readImageFile(blob, onSuccess) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var image = new Image();
    image.src = e.target.result;
    image.onload = function() {
      var img = new fabric.Image(image);
      img.set({
        left: 100,
        top: 60
      });
      img.scaleToWidth(200);
      _canvas.add(img).setActiveObject(img).requestRenderAll();
      onSuccess();
    }
  }
  reader.readAsDataURL(blob);
}

async function postMapFile(blob, fileName, onSuccess) {
  const formData = new FormData();
  formData.append("fileData", blob, fileName);
  fetch("/maps/upload", {
    mode: 'no-cors',
    method: 'POST',
    body: formData
  }).then((res) => {
    if (res.status == 200) {
      res.json().then((data) => {
        processMap(data);
        onSuccess();
      });
    } else if (res.status == 413 || res.status == 415 || res.status == 422) {
      res.json().then((data) => {
        window.alert(data.msg);
      });
    } else if (res.status == 401) {
      onSuccess();
      showLogin();
    } else {
      window.alert("Unexpected response code " + res.status);
    }
  }).catch((error) => {
    console.error(error);
    window.alert("Unable to upload selected file.  Please try again.");
  });
}

function uploadFile(modal, data) {
  const input = document.getElementById('file');
  if (!input.files[0]) {
    alert("Please choose a file before clicking 'Upload'");
    return;
  }

  const file = input.files[0];
  const closeModal = () => { modal.hide() };
  postFile(file, input.files[0].name, data, closeModal);
}

function uploadSelectedFile(data) {
  const modalEl = document.getElementById('uploadFile')
  const modal = bootstrap.Modal.getInstance(modalEl);
  uploadFile(modal, data);
}

async function deleteMap(mapName) {
  removeMap(mapName);
}

function ESC(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

function copyToClipboard(text) {
  var tmpElement = document.createElement("input");
  tmpElement.value = text;
  document.body.appendChild(tmpElement);
  tmpElement.select();
  document.execCommand("copy");
  document.body.removeChild(tmpElement);
}

function copyMap() {
  let data = _map;
  if (data) {
    data.canvas = _canvas.toJSON();
    copyToClipboard(JSON.stringify(data, function (key, value) {
      if (key.startsWith("computed_")) {
        return undefined;
      }
      return value;
    }, 1));
    writeMessage(`Copied map "${data.name}" information to clipboard`);
  }
}

function editMode() {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'edit');
  window.location.assign(url.search);
}