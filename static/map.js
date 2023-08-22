
function renderMap(canvas, map) {
  //console.log(`renderMap() -`, map);
  if (map.canvasData) {
    canvas.loadFromJSON(map.canvasData);
  }
}

function _createMap(id, sp, summary = null) {
  const feat = new fabric.Feat({
    left: 50,
    top: 50,
    width: 200,
    height: 110,
    strokeWidth: 2,
    rx: 10,
    ry: 10,
    scaleX: 4,
    scaleY: 4,
    opacity: 0.9,
    summary: summary ?? "My Map",
    id: id,
    sp: sp,
    status: "active"
  });
  return feat;
}

function _createNode(id, sp, summary = null) {
  const feat = new fabric.Item({
    left: 50,
    top: 50,
    width: 120,
    height: 100,
    strokeWidth: 2,
    rx: 10,
    ry: 10,
    summary: summary ?? "My Item",
    id: id,
    sp: sp,
    status: "ready"
  });
  return feat;
}

function calcItemSize(sp) {
  // width = (N * 170 + 50) / 4
  if (sp >= 80) {
    return 607.5;
  } else if (sp >= 40) {
    return 310;
  } else if (sp >= 21) {
    return 267.5;
  } else if (sp >= 13) {
    return 225;
  } else if (sp >= 8) {
    return 182.5
  }
  return 140;
}

function _getStatusStroke(status) {
  if (status === "backlog") {
    return "#000000";
  } else if (status === "pending") {
    return "#B2A515";
  } else if (status === "ready") {
    return "#06168E";
  } else if (status === "blocked") {
    return "#C16767";
  } else if (status === "inprogress") {
    return "#EBDA24";
  } else if (status === "completed") {
    return "#01740F";
  }
  return "#000000";
}

function renderCanvasFromMap(canvas, map) {
  console.log(`renderCanvasFromMap() -`, map.mapData);
  if (!map.mapData) {
    return;
  }

  let items = map.mapData.clusters;

  let left = 50;
  let top = 50;
  let rowHeight = 0;
  let ratio = canvas.height / canvas.width - 0.1;
  if (ratio > 1) {
    ratio = canvas.width / canvas.height - 0.1;
  }
  if (ratio < 0.7) {
    ratio = 0.7;
  }

  items.forEach((item) => {
    //console.log(item);
    const effort = 13; // Calc item size
    let obj;
    if (item.type === "cluster") {
      obj = _createMap(item.name, effort, item.caption ?? item.name);
    } else {
      obj = _createNode(item.name, effort, item.caption ?? item.name);
    }
    obj.myitem = item;
    obj.estimate = 8;
    obj.set({left: left, top: top, width: calcItemSize(item.estimate ?? effort), status: item.status?.toLowerCase() ?? "UNKNOWN"});
    canvas.add(obj);
    if (item.nodes) {
      const childrenTop = _renderChildrenItems(canvas, item, obj);
      if (childrenTop > obj.top + obj.height * obj.scaleY) {
        obj.set({height: (childrenTop - top + obj.height - 50) / obj.scaleY});
      }
    }
    if (obj.height > rowHeight) {
      rowHeight = obj.height;
    }

    left += obj.width * obj.scaleX + 50;
    if (left > canvas.width * obj.scaleX * ratio) {
      left = 50;
      top += rowHeight * obj.scaleY + 50;
      rowHeight = 0;
    }
  });
}

function _renderChildrenItems(canvas, parentItem, parentObject) {
  let left = parentObject.left + 50;
  let top = parentObject.top + 100;
  let item = null;

  function nextColRow(item, newline = false) {
    if (item) {
      left += item.width * item.scaleX + 50;
    }
    
    if (newline || left > parentObject.left + parentObject.width * parentObject.scaleX - 120) {
      left = parentObject.left + 50;
      if (item) {
        top += item.height * item.scaleY + 50;
      }
      item = null;
    }
  }

  let items = parentItem.nodes;

  items.forEach((child) => {
    // Handle nested items (i.e. groups)
    if (child.nodes) {
      nextColRow(item, true);
      let x = left - 8;
      let y = top - 8;
      let width = 0;
      let height = 0;
      let index = canvas.size();

      let children = child.nodes;

      children.sort(function (a, b) {
        let result = compare(a, b, "status") * -1;
        if (result === 0) {
          result = compare(a, b, "name");
        }
        return result;
      });

      children.forEach((node) => {
        item = _createNode(node.name, node.estimate ?? 3, node.summary ?? node.name);
        item.myitem = node;
        item.parentItem = child;
        item.set({left: left, top: top, status: story.status.toLowerCase()});
        canvas.add(item);
        width = Math.max(width, item.left + item.width - x);
        height = item.top + item.height - y;
        nextColRow(item);
      });

      if (width > 0) {
        const groupRect = new fabric.Rect();
        groupRect.type = child.type.toLowerCase();
        groupRect.summary = child.summary ?? child.name;
        groupRect.id = child.name;
        groupRect.sp = child.estimate ?? 3;
        groupRect.status = child.status.toLowerCase();
        groupRect.myitem = child;
        groupRect.parentItem = parentItem;
        groupRect.set({
          left: x, top: y, width: width + 8, height: height + 8, rx: 10, ry: 10, fill: null,
            stroke: _getStatusStroke(groupRect.status), strokeDashArray: [5, 5], strokeWidth: 2, opacity: 1, padding: 0
        });
        canvas.insertAt(groupRect, index);
      }
    } else {
      item = _createNode(child.name, child.estimate ?? 3, child.summary ?? child.name);
      item.myitem = child;
      item.parentItem = parentItem;
      item.parentObject = parentObject;      
      item.set({left: left, top: top, status: child.status.toLowerCase()});
      canvas.add(item);
      nextColRow(item);
    }
  });

  nextColRow(item, true);
  return top;
}
